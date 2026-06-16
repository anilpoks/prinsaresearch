/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { PatientProfile, AnalyticsData } from "./types";
import { calculateRegistryAnalytics, generateRefMockCohort } from "./utils";
import Dashboard from "./components/Dashboard";
import PatientForm from "./components/PatientForm";
import CohortList from "./components/CohortList";
import Analysis from "./components/Analysis";
import { UserManagement } from "./components/UserManagement";
import { 
  HeartPulse, 
  LayoutDashboard, 
  Users, 
  BarChart, 
  PlusCircle, 
  HelpCircle,
  Database,
  Sparkles,
  Cloud,
  CloudOff,
  LogOut,
  LogIn,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Shield
} from "lucide-react";
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  setDoc, 
  doc, 
  deleteDoc, 
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut 
} from "firebase/auth";
import { auth, db, handleFirestoreError, OperationType } from "./firebase";

// Validate connection to Firestore on boot as directed
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. Client is offline.");
    }
  }
}
testConnection();

export default function App() {
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [activeTab, setActiveTab] = useState<"dashboard" | "cohort" | "analysis" | "form" | "settings">("dashboard");
  const [editingPatient, setEditingPatient] = useState<PatientProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<"admin" | "manager" | null>(null);
  const [syncState, setSyncState] = useState<"offline" | "syncing" | "synced" | "error">("offline");
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Auth and Firestore listener
  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        setSyncState("syncing");
        
        let checkedRole: "admin" | "manager" = user.email === "anilpokhrel@gmail.com" ? "admin" : "manager";
        
        // Auto-register/fetch user's role profile in Firestore
        try {
          const roleDocRef = doc(db, "roles", user.uid);
          const roleSnap = await getDocFromServer(roleDocRef).catch(() => null);
          if (roleSnap && roleSnap.exists()) {
            checkedRole = roleSnap.data().role as "admin" | "manager";
          } else {
            // Auto-create document
            await setDoc(roleDocRef, {
              id: user.uid,
              email: user.email || "",
              role: checkedRole
            });
          }
        } catch (err) {
          console.warn("User role automatic check/registration omitted:", err);
        }
        
        setUserRole(checkedRole);

        // Listen to live changes for ALL patients since it is a shared team clinical registry
        const q = collection(db, "patients");
        
        unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const firestorePatients: PatientProfile[] = [];
          snapshot.forEach((doc) => {
            firestorePatients.push(doc.data() as PatientProfile);
          });
          
          setPatients(firestorePatients);
          localStorage.setItem("cld_portal_vein_registry", JSON.stringify(firestorePatients));
          setSyncState("synced");
          setIsInitialLoad(false);
        }, (err) => {
          setSyncState("error");
          setIsInitialLoad(false);
          handleFirestoreError(err, OperationType.LIST, "patients");
        });
      } else {
        setUserRole(null);
        setSyncState("offline");
        
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
          unsubscribeSnapshot = null;
        }

        // Load fallback storage
        const stored = localStorage.getItem("cld_portal_vein_registry");
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) {
              setPatients(parsed);
            }
          } catch (e) {
            console.error("Failed to parse registry from localStorage", e);
          }
        }
        setIsInitialLoad(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  // Save to local storage as fallback/cache
  const savePatientsLocally = (newPatients: PatientProfile[]) => {
    setPatients(newPatients);
    localStorage.setItem("cld_portal_vein_registry", JSON.stringify(newPatients));
  };

  // Google Login action
  const handleSignIn = async () => {
    try {
      setSyncState("syncing");
      const provider = new GoogleAuthProvider();
      // Configure popup login for better compatibility in sandboxed iframes
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Google authentication failed", err);
      setSyncState("error");
    }
  };

  // Logout action
  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err: any) {
      console.error("Logout failed", err);
    }
  };

  // Bulk sync current local data to newly logged in cloud account
  const handleBulkSync = async () => {
    if (!currentUser) return;
    setSyncState("syncing");
    try {
      const batch = writeBatch(db);
      patients.forEach(patient => {
        const docRef = doc(db, "patients", patient.id);
        const syncedPatient: PatientProfile = {
          ...patient,
          userId: currentUser.uid,
          updatedAt: new Date().toISOString()
        };
        batch.set(docRef, syncedPatient);
      });
      await batch.commit();
      setSyncState("synced");
      alert(`Successfully synchronized ${patients.length} patient records to your secure cloud account!`);
    } catch (err) {
      setSyncState("error");
      handleFirestoreError(err, OperationType.WRITE, "patients (bulk sync)");
    }
  };

  // Automated seed trigger
  const handleSeedMockData = async () => {
    const mockCohort = generateRefMockCohort();
    
    if (currentUser) {
      setSyncState("syncing");
      try {
        const batch = writeBatch(db);
        mockCohort.forEach(patient => {
          const docRef = doc(db, "patients", patient.id);
          const patientWithUser: PatientProfile = {
            ...patient,
            userId: currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          batch.set(docRef, patientWithUser);
        });
        await batch.commit();
        setSyncState("synced");
      } catch (err) {
        setSyncState("error");
        handleFirestoreError(err, OperationType.WRITE, "patients (seed)");
      }
    } else {
      savePatientsLocally(mockCohort);
    }
    setActiveTab("dashboard");
  };

  // Add Patient profile
  const handleAddPatientClick = () => {
    setEditingPatient(null);
    setActiveTab("form");
  };

  // Edit Patient profile
  const handleEditPatientClick = (patient: PatientProfile) => {
    setEditingPatient(patient);
    setActiveTab("form");
  };

  // Delete Patient profile
  const handleDeletePatient = async (id: string) => {
    if (window.confirm("Are you sure you want to permanently remove this participant CRF record from the registry?")) {
      const remaining = patients.filter(p => p.id !== id);
      savePatientsLocally(remaining);

      if (currentUser) {
        try {
          await deleteDoc(doc(db, "patients", id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `patients/${id}`);
        }
      }
    }
  };

  // Import JSON action
  const handleImportJSON = async (imported: PatientProfile[]) => {
    const confirmOverwrite = window.confirm("Do you want to merge imported records with current registry? (Click Cancel to completely overwrite current dataset)");
    
    let merged = [...patients];
    if (confirmOverwrite) {
      imported.forEach(imp => {
        const idx = merged.findIndex(p => p.demographics.codeNo === imp.demographics.codeNo);
        if (idx >= 0) {
          merged[idx] = imp;
        } else {
          merged.push(imp);
        }
      });
    } else {
      merged = imported;
    }

    if (currentUser) {
      setSyncState("syncing");
      try {
        const batch = writeBatch(db);
        merged.forEach(p => {
          const docRef = doc(db, "patients", p.id);
          const patientWithUser: PatientProfile = {
            ...p,
            userId: currentUser.uid,
            updatedAt: new Date().toISOString()
          };
          batch.set(docRef, patientWithUser);
        });
        await batch.commit();
        setSyncState("synced");
      } catch (err) {
        setSyncState("error");
        handleFirestoreError(err, OperationType.WRITE, "patients (import)");
      }
    } else {
      savePatientsLocally(merged);
    }
  };

  // Save/Submit Form handler
  const handleFormSave = async (patient: PatientProfile) => {
    let updatedPatient = { ...patient };
    if (currentUser) {
      updatedPatient.userId = currentUser.uid;
    } else {
      updatedPatient.userId = "anonymous";
    }

    const index = patients.findIndex(p => p.id === patient.id);
    let updated: PatientProfile[];
    if (index >= 0) {
      updated = [...patients];
      updated[index] = updatedPatient;
    } else {
      updated = [...patients, updatedPatient];
    }
    
    // Optimistic UI updates
    savePatientsLocally(updated);

    if (currentUser) {
      try {
        await setDoc(doc(db, "patients", updatedPatient.id), updatedPatient);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `patients/${updatedPatient.id}`);
      }
    }
    setActiveTab("cohort"); // Navigate to list
  };

  // Form cancel
  const handleFormCancel = () => {
    setActiveTab("cohort");
  };

  // Calculate high-fidelity stats live
  const analytics = calculateRegistryAnalytics(patients);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 antialiased font-sans flex flex-col selection:bg-blue-100">
      {/* Upper Navigation Rail bar */}
      <header className="no-print bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm md:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center px-4 py-3.5 gap-4">
          
          {/* Logo & title block */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl shadow-sm border border-slate-800">
              <HeartPulse size={20} className="animate-pulse text-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black font-mono tracking-widest text-blue-600 uppercase bg-blue-50 border border-blue-100/70 px-2 py-0.5 rounded-md">Research Registry</span>
                <span className="text-[10px] text-slate-400 font-bold font-mono">Ver 2.4.1</span>
              </div>
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight font-sans">
                Kathmandu Medical College Clinical Registry
              </h1>
            </div>
          </div>

          {/* Sync & Auth blocks row */}
          <div className="flex items-center gap-4 flex-wrap md:flex-nowrap">
            {/* Sync State badge */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              {syncState === "synced" && (
                <span className="flex items-center gap-1 bg-emerald-55/10 text-emerald-700 border border-emerald-200/50 px-2.5 py-1 rounded-lg font-bold">
                  <Cloud size={13} className="text-emerald-600" />
                  Synced
                </span>
              )}
              {syncState === "syncing" && (
                <span className="flex items-center gap-1 bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-bold animate-pulse">
                  <Loader2 size={13} className="animate-spin text-blue-600" />
                  Syncing...
                </span>
              )}
              {syncState === "offline" && (
                <span className="flex items-center gap-1 bg-slate-50 text-slate-500 border border-slate-200/50 px-2.5 py-1 rounded-lg">
                  <CloudOff size={13} className="text-slate-400" />
                  Offline Sandbox
                </span>
              )}
              {syncState === "error" && (
                <span className="flex items-center gap-1 bg-rose-50 text-rose-700 border border-rose-100 px-2.5 py-1 rounded-lg font-bold">
                  <AlertCircle size={13} className="text-rose-600" />
                  Sync Error
                </span>
              )}
            </div>

            {/* Nav Tab Options */}
            <nav className="flex items-center bg-slate-100/80 p-1 rounded-xl border border-slate-200/50 text-xs font-semibold select-none">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "dashboard"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <LayoutDashboard size={14} />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("cohort")}
                className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "cohort"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Users size={14} />
                Cohort Registry
                {patients.length > 0 && (
                  <span className="text-[9px] bg-blue-50 text-blue-600 font-bold px-1.5 py-0.5 rounded-full border border-blue-100/50 font-mono">
                    {patients.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab("analysis")}
                className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "analysis"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <BarChart size={14} />
                Objective Analysis
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`px-3.5 py-2 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === "settings"
                    ? "bg-white text-blue-600 shadow-sm border border-slate-200/20"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <Shield size={14} />
                Management
              </button>
            </nav>

            {/* Auth Button */}
            <div className="border-l border-slate-200 pl-4 flex items-center gap-3">
              {currentUser ? (
                <div className="flex items-center gap-2.5">
                  {currentUser.photoURL && (
                    <img 
                      src={currentUser.photoURL} 
                      alt="Avatar" 
                      className="w-7 h-7 rounded-full border border-slate-200 shadow-sm"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="hidden lg:block text-left select-none max-w-[120px]">
                    <p className="text-[11px] font-bold text-slate-800 leading-tight truncate">{currentUser.displayName || "Researcher"}</p>
                    <p className="text-[9px] text-slate-400 leading-none truncate">{currentUser.email}</p>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg border border-slate-200 shadow-xs cursor-pointer transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleSignIn}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-sm shadow-blue-500/10 cursor-pointer transition-all"
                >
                  <LogIn size={13} />
                  Researcher Login
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Unsynced offline cohort bulk sync alert banner */}
      {currentUser && patients.some(p => !p.userId || p.userId === "anonymous") && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-900 select-none">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2 font-medium animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-800 rounded-lg">
                <Database size={14} className="animate-bounce" />
              </span>
              <span>
                Found <strong className="font-extrabold">{patients.filter(p => !p.userId || p.userId === "anonymous").length} patient records</strong> created in temporary offline storage. Synchronize them to your secure cloud backup?
              </span>
            </div>
            <button
              onClick={handleBulkSync}
              className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shadow-sm cursor-pointer transition-all flex items-center gap-1"
            >
              <Cloud size={12} />
              Sync Offline Cohort
            </button>
          </div>
        </div>
      )}

      {/* Main Container Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        
        {/* Dynamic Context Tabs */}
        {activeTab === "dashboard" && (
          <Dashboard 
            patients={patients}
            analytics={analytics}
            onNavigateToCRF={handleAddPatientClick}
            onNavigateToAnalysis={() => setActiveTab("analysis")}
            onImportJSON={handleImportJSON}
          />
        )}

        {activeTab === "cohort" && (
          <CohortList 
            patients={patients}
            onAddPatient={handleAddPatientClick}
            onEditPatient={handleEditPatientClick}
            onDeletePatient={handleDeletePatient}
            onSeedMockData={handleSeedMockData}
            userRole={userRole}
          />
        )}

        {activeTab === "analysis" && (
          <Analysis 
            patients={patients}
            analytics={analytics}
          />
        )}

        {activeTab === "settings" && (
          <UserManagement userRole={userRole} />
        )}

        {activeTab === "form" && (
          <PatientForm 
            initialPatient={editingPatient}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
            allExistingPatients={patients}
          />
        )}
      </main>

      {/* Hospital Footer credits block */}
      <footer className="no-print bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-400 font-light select-none">
        <div className="max-w-7xl mx-auto px-4 space-y-1">
          <p>&copy; 2026 Kathmandu Medical College and Teaching Hospital, Sinamangal, Kathmandu, Nepal.</p>
          <p className="text-[10px] text-slate-300 font-mono">
            Prepared as clinical software tool matching IRB protocol &middot; Internal Medicine division
          </p>
        </div>
      </footer>
    </div>
  );
}
