import React, { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  Monitor,
  RotateCcw,
  Printer,
  Calendar,
  Clock,
  ClipboardList,
  Plus,
  Trash2,
  Sparkles,
  MonitorSmartphone,
  Loader2,
  AlertCircle,
  Download,
  Save,
  CheckCircle2,
  History,
  ArrowLeft,
  Edit,
  FileText,
} from "lucide-react";

const firebaseConfig = {
  apiKey: "AIzaSyAGFh8xh6Y-gLOGU8aircrQhQefgOVJv9Q",
  authDomain: "maintenance-app-b8f30.firebaseapp.com",
  projectId: "maintenance-app-b8f30",
  storageBucket: "maintenance-app-b8f30.firebasestorage.app",
  messagingSenderId: "844000917870",
  appId: "1:844000917870:web:d6dd367355cebf6c01697f",
  measurementId: "G-EN81EWH0LE",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

export default function App() {
  // Navigation State
  const [viewMode, setViewMode] = useState("form"); // 'form' | 'history'

  const [formData, setFormData] = useState({
    date: "2026-02-26",
    startTime: "",
    customer: "",
    finishTime: "",
    itSupport: [],
    location: "",
    technicianSignature: [],
  });

  const [serviceRequests, setServiceRequests] = useState([
    { id: 1, name: "", description: "" },
  ]);

  const [serviceReports, setServiceReports] = useState([
    { id: 1, computerName: "", description: "" },
  ]);

  // AI & Export States
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [aiError, setAiError] = useState("");

  // Database States
  const [user, setUser] = useState(null);
  const [isSavingDB, setIsSavingDB] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const [savedReports, setSavedReports] = useState([]);
  const [currentDocId, setCurrentDocId] = useState(null);

  // Dropdown States
  const [isItSupportOpen, setIsItSupportOpen] = useState(false);
  const [isTechSigOpen, setIsTechSigOpen] = useState(false);

  // Modal States
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [isClearingAll, setIsClearingAll] = useState(false);

  // Auth Init
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (
          typeof __initial_auth_token !== "undefined" &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // Fetch History
  useEffect(() => {
    if (!user) return;
    const reportsRef = collection(
      db,
      "artifacts",
      appId,
      "shared_maintenance_reports",
    );

    const unsubscribe = onSnapshot(
      reportsRef,
      (snapshot) => {
        const reports = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // เรียงลำดับจากใหม่ไปเก่า (Sort in memory)
        reports.sort((a, b) => {
          const timeA = a.createdAt?.toMillis() || 0;
          const timeB = b.createdAt?.toMillis() || 0;
          return timeB - timeA;
        });
        setSavedReports(reports);
      },
      (error) => {
        console.error("Error fetching reports:", error);
      },
    );

    return () => unsubscribe();
  }, [user]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setFormData({
      date: "",
      startTime: "",
      customer: "",
      finishTime: "",
      itSupport: [],
      location: "",
      technicianSignature: [],
    });
    setServiceRequests([{ id: Date.now(), name: "", description: "" }]);
    setServiceReports([{ id: Date.now(), computerName: "", description: "" }]);
    setCurrentDocId(null);
    setAiError("");
  };

  const handlePrint = () => {
    // เรียกหน้าต่างเลือกเครื่องปริ้นของเบราว์เซอร์ทันที
    window.print();
  };

  const handleSaveToDB = async () => {
    if (!user) {
      setAiError("กรุณารอระบบเชื่อมต่อฐานข้อมูลสักครู่...");
      return;
    }
    setIsSavingDB(true);
    setAiError("");
    setSaveSuccessMessage("");

    try {
      const reportsRef = collection(
        db,
        "artifacts",
        appId,
        "shared_maintenance_reports",
      );

      if (currentDocId) {
        // อัปเดตข้อมูลเดิม
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "shared_maintenance_reports",
          currentDocId,
        );
        await updateDoc(docRef, {
          formData,
          serviceRequests,
          serviceReports,
          updatedAt: serverTimestamp(),
        });
        setSaveSuccessMessage("อัปเดตข้อมูลสำเร็จ!");
      } else {
        // สร้างข้อมูลใหม่
        const newDoc = await addDoc(reportsRef, {
          formData,
          serviceRequests,
          serviceReports,
          createdAt: serverTimestamp(),
        });
        setCurrentDocId(newDoc.id);
        setSaveSuccessMessage("บันทึกข้อมูลลงระบบฐานข้อมูลสำเร็จ!");
      }

      setTimeout(() => setSaveSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error saving to DB:", err);
      setAiError("เกิดข้อผิดพลาดในการบันทึกข้อมูล");
    } finally {
      setIsSavingDB(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!user || !window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบข้อมูลนี้?"))
      return;
    try {
      const docRef = doc(
        db,
        "artifacts",
        appId,
        "users",
        user.uid,
        "maintenance_reports",
        id,
      );
      await deleteDoc(docRef);
      if (currentDocId === id) {
        handleClear();
      }
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("เกิดข้อผิดพลาดในการลบข้อมูล");
    }
  };

  const confirmClearAllHistory = async () => {
    setIsClearingAll(true);
    try {
      // ทำการลบข้อมูลทุกรายการที่อยู่ในประวัติ
      const deletePromises = savedReports.map((report) => {
        const docRef = doc(
          db,
          "artifacts",
          appId,
          "shared_maintenance_reports",
          report.id,
        );
        return deleteDoc(docRef);
      });
      await Promise.all(deletePromises);

      // ล้างข้อมูลในฟอร์มด้วยถ้ากำลังเปิดเอกสารเก่าอยู่
      if (currentDocId) {
        handleClear();
      }
    } catch (err) {
      console.error("Error clearing all history:", err);
      alert("เกิดข้อผิดพลาดในการล้างประวัติข้อมูล");
    } finally {
      setIsClearingAll(false);
      setIsClearAllModalOpen(false);
    }
  };

  const loadReportToForm = (report) => {
    setFormData(
      report.formData || {
        date: "",
        startTime: "",
        customer: "",
        finishTime: "",
        itSupport: [],
        location: "",
        technicianSignature: [],
      },
    );
    setServiceRequests(
      report.serviceRequests || [{ id: Date.now(), name: "", description: "" }],
    );
    setServiceReports(
      report.serviceReports || [
        { id: Date.now(), computerName: "", description: "" },
      ],
    );
    setCurrentDocId(report.id);
    setViewMode("form");
  };

  const handleSavePDF = async () => {
    setIsExportingPDF(true);
    setAiError("");
    try {
      if (!window.html2pdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src =
            "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const element = document.getElementById("pdf-content");
      const safeCustomerName = formData.customer
        ? formData.customer.replace(/[^a-zA-Z0-9ก-๙]/g, "_")
        : "Unnamed";
      const safeDate = formData.date
        ? formData.date.replace(/\//g, "-")
        : "NoDate";

      const opt = {
        margin: 0.3,
        filename: `Maintenance_Report_${safeCustomerName}_${safeDate}.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
      };

      await window.html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      setAiError("เกิดข้อผิดพลาดในการสร้างไฟล์ PDF โปรดลองอีกครั้ง");
    } finally {
      setIsExportingPDF(false);
    }
  };

  // --- Service Request Functions ---
  const addServiceRequest = () => {
    setServiceRequests([
      ...serviceRequests,
      { id: Date.now(), name: "", description: "" },
    ]);
  };

  const removeServiceRequest = (id) => {
    if (serviceRequests.length > 1) {
      setServiceRequests(serviceRequests.filter((req) => req.id !== id));
    }
  };

  const updateServiceRequest = (id, field, value) => {
    setServiceRequests(
      serviceRequests.map((req) =>
        req.id === id ? { ...req, [field]: value } : req,
      ),
    );
    if (field === "description" && aiError) setAiError("");
  };

  // --- Service Report Functions ---
  const addServiceReport = () => {
    setServiceReports([
      ...serviceReports,
      { id: Date.now(), computerName: "", description: "" },
    ]);
  };

  const removeServiceReport = (id) => {
    if (serviceReports.length > 1) {
      setServiceReports(serviceReports.filter((rep) => rep.id !== id));
    }
  };

  const updateServiceReport = (id, field, value) => {
    setServiceReports(
      serviceReports.map((rep) =>
        rep.id === id ? { ...rep, [field]: value } : rep,
      ),
    );
  };

  // --- Gemini API Integration ---
  const apiKey = "AIzaSyCJFmXj3Ylp-7ZcqrHKxiOCVutRuMlX3ZE";

  const fetchWithBackoff = async (url, options, retries = 5) => {
    const delays = [1000, 2000, 4000, 8000, 16000];
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, options);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise((res) => setTimeout(res, delays[i]));
      }
    }
  };

  const generateAIReport = async () => {
    const issues = serviceRequests
      .map((req) => req.description)
      .filter((desc) => desc.trim() !== "")
      .join(" และ ");

    if (!issues) {
      setAiError(
        "โปรดกรอกรายละเอียดอาการเสีย (Description) ในรายการแจ้งงานก่อนให้ AI ช่วยเขียนครับ",
      );
      return;
    }

    setAiError("");
    setIsGenerating(true);

    const prompt = `คุณคือช่างเทคนิค IT Support มืออาชีพ ลูกค้าได้แจ้งอาการเสียของคอมพิวเตอร์ดังนี้: "${issues}"
    
โปรดเขียนสรุป "รายละเอียดการให้บริการ/การแก้ไขปัญหา" (Action Taken) แบบสั้นๆ กระชับ เป็นทางการ สำหรับใส่ในเอกสาร Maintenance Report 
(คำแนะนำ: ไม่ต้องมีคำทักทาย ไม่ต้องมีคำลงท้าย เขียนเฉพาะสิ่งที่ช่างได้ดำเนินการแก้ไขปัญหาไปแล้วให้ดูเป็นมืออาชีพ)`;

    try {
      const result = await fetchWithBackoff(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
        },
      );

      const generatedText = result?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (generatedText) {
        if (serviceReports.length > 0) {
          updateServiceReport(
            serviceReports[0].id,
            "description",
            generatedText.trim(),
          );
        }
      } else {
        setAiError("ไม่สามารถสร้างข้อความได้ในขณะนี้ โปรดลองอีกครั้ง");
      }
    } catch (err) {
      setAiError("เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์ AI");
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  // --- Group Reports by Customer for History View ---
  const groupedReports = savedReports.reduce((acc, report) => {
    const customer = report.formData?.customer || "ไม่ระบุบริษัทลูกค้า";
    if (!acc[customer]) acc[customer] = [];
    acc[customer].push(report);
    return acc;
  }, {});

  const sortedCustomers = Object.keys(groupedReports).sort((a, b) => {
    if (a === "ไม่ระบุบริษัทลูกค้า") return 1;
    if (b === "ไม่ระบุบริษัทลูกค้า") return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 font-sans text-gray-800 print:bg-white print:py-0 print:px-0">
      {/* ตั้งค่า CSS พิเศษสำหรับการพิมพ์โดยเฉพาะ */}
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 10mm; }
          
          /* เคล็ดลับย่อขนาด: ลด Base Font Size ลงเหลือ 80% เฉพาะตอนพิมพ์ */
          /* จะทำให้ระบบ Tailwind ย่อขนาด Text, Padding, Margin ทุกอย่างลงตามสัดส่วนนี้พอดี */
          html {
            font-size: 80% !important;
          }

          body { 
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
            background-color: white !important;
          }
          /* ซ่อน Scrollbar เวลากดพิมพ์ */
          ::-webkit-scrollbar { display: none; }
          textarea { overflow: hidden !important; }
        }
      `}</style>

      {saveSuccessMessage && viewMode === "form" && (
        <div className="max-w-5xl mx-auto mb-4 bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-md flex items-center print:hidden shadow-sm">
          <CheckCircle2 className="w-5 h-5 mr-2" />
          {saveSuccessMessage}
        </div>
      )}
      {/* Top Action Bar */}
      <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm p-4 mb-6 flex flex-wrap gap-4 justify-between items-center print:hidden border border-gray-200">
        <div className="flex items-center space-x-3">
          <Monitor className="text-teal-700 w-6 h-6" />
          <h1 className="text-xl font-bold text-gray-800">
            {viewMode === "form" ? "Maintenance Report" : "ประวัติการแจ้งซ่อม"}
          </h1>
          {viewMode === "form" && (
            <span className="bg-emerald-100 text-emerald-700 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center">
              AI Powered ✨
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {viewMode === "history" ? (
            <button
              onClick={() => setViewMode("form")}
              className="flex items-center px-4 py-2 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> กลับไปหน้าฟอร์ม
            </button>
          ) : (
            <>
              <button
                onClick={() => setViewMode("history")}
                className="flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 rounded-md text-sm font-medium transition-colors"
              >
                <History className="w-4 h-4 mr-2" /> ประวัติข้อมูล
              </button>
              <button
                onClick={handleClear}
                className="flex items-center px-4 py-2 bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 rounded-md text-sm font-medium transition-colors"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                {currentDocId ? "สร้างใบใหม่" : "ล้างข้อมูล"}
              </button>
              <button
                onClick={handleSaveToDB}
                disabled={isSavingDB || !user}
                className={`flex items-center px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${
                  isSavingDB || !user
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSavingDB ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {currentDocId ? "อัปเดตข้อมูล" : "บันทึกเข้าระบบ"}
              </button>
              <button
                onClick={handleSavePDF}
                disabled={isExportingPDF}
                className={`flex items-center px-4 py-2 text-white rounded-md text-sm font-medium transition-colors ${
                  isExportingPDF
                    ? "bg-red-400 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {isExportingPDF ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                ดาวน์โหลด PDF
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center px-4 py-2 bg-teal-700 text-white hover:bg-teal-800 rounded-md text-sm font-medium transition-colors"
              >
                <Printer className="w-4 h-4 mr-2" /> พิมพ์
              </button>
            </>
          )}
        </div>
      </div>

      {viewMode === "history" ? (
        /* History Dashboard View */
        <div className="max-w-5xl mx-auto bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden print:hidden">
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-gray-500" />
              เอกสารทั้งหมดของคุณ ({savedReports.length} รายการ)
            </h2>
            {/* ปุ่มล้างข้อมูลทั้งหมด */}
            {savedReports.length > 0 && (
              <button
                onClick={() => setIsClearAllModalOpen(true)}
                className="flex items-center px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 rounded-md text-sm font-medium transition-colors border border-red-200"
              >
                <Trash2 className="w-4 h-4 mr-1.5" /> ล้างข้อมูลทั้งหมด
              </button>
            )}
          </div>

          {savedReports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p>ยังไม่มีประวัติการบันทึกเอกสาร</p>
            </div>
          ) : (
            <div className="p-4 bg-gray-100">
              {sortedCustomers.map((customer) => (
                <div
                  key={customer}
                  className="mb-6 bg-white rounded-lg border border-gray-300 shadow-sm overflow-hidden last:mb-0"
                >
                  {/* Customer Header Banner */}
                  <div className="bg-[#243041] px-5 py-3 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="font-bold text-white text-base flex items-center">
                      🏢 ลูกค้า:{" "}
                      <span className="ml-2 text-emerald-300">{customer}</span>
                    </h3>
                    <span className="bg-white/20 text-white text-xs px-2.5 py-1 rounded-full">
                      {groupedReports[customer].length} รายการ
                    </span>
                  </div>

                  {/* Reports Table for this Customer */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-600">
                      <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-3">วันที่</th>
                          <th className="px-6 py-3">IT Support</th>
                          <th className="px-6 py-3">สถานที่ (Location)</th>
                          <th className="px-6 py-3 text-right">การจัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedReports[customer].map((report) => {
                          const data = report.formData;
                          return (
                            <tr
                              key={report.id}
                              className="bg-white border-b hover:bg-gray-50 transition-colors last:border-0"
                            >
                              <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {data?.date || "ไม่มีวันที่"}
                              </td>
                              <td className="px-6 py-4">
                                {data?.itSupport?.length > 0
                                  ? data.itSupport.join(", ")
                                  : "-"}
                              </td>
                              <td className="px-6 py-4">
                                {data?.location || "-"}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => loadReportToForm(report)}
                                  className="text-blue-600 hover:text-blue-900 mx-2 p-1.5 bg-blue-50 rounded hover:bg-blue-100 transition-colors"
                                  title="เปิดแก้ไข"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteReport(report.id)}
                                  className="text-red-600 hover:text-red-900 p-1.5 bg-red-50 rounded hover:bg-red-100 transition-colors"
                                  title="ลบ"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Main Document Body Form View */
        <div
          id="pdf-content"
          className="max-w-5xl mx-auto bg-white border border-gray-300 shadow-sm print:max-w-none print:w-full print:shadow-none print:border-none print:m-0 relative flex flex-col min-h-[297mm] print:min-h-[276mm]"
        >
          {/* Document ID Indicator (Hidden on print) */}
          {currentDocId && (
            <div
              data-html2canvas-ignore="true"
              className="absolute top-0 right-0 bg-yellow-100 text-yellow-800 text-[10px] px-2 py-1 rounded-bl-md print:hidden border-l border-b border-yellow-200 shadow-sm"
            >
              กำลังแก้ไขเอกสารที่บันทึกไว้
            </div>
          )}

          {/* Company Header Info */}
          <div className="p-6 border-b border-gray-300">
            <div className="flex items-center space-x-6">
              {/* New Logo Implementation - Adjusted for Print */}
              <div className="w-52 print:w-48 shrink-0 flex items-center justify-center">
                <img
                  src="/APC.jpg"
                  alt="APC Logo"
                  className="w-full h-auto object-contain"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://placehold.co/400x120/0d5951/white?text=Missing+APC.jpg";
                  }}
                />
              </div>
              <div className="pt-1">
                <h2 className="text-xl font-bold text-[#0d5951] mb-1">
                  Asoke Prasanmit Computer Co., Ltd.
                </h2>
                <p className="text-sm text-gray-600 leading-snug">
                  BKK: 90 ซอยอนามัย ถนนศรีนครินทร์ 24 แขวงสวนหลวง เขตสวนหลวง
                  กทม. 10250
                  <br />
                  BANGPOO: 190/253 หมู่ 6 ต.แพรกษา อ.เมือง จ.สมุทรปราการ 10280
                  <br />
                  Tel. 02-3219939 (Auto) Fax. 02-3219941 | Email:
                  sales@asoke-computer.com
                </p>
              </div>
            </div>
          </div>

          {/* Title Banner */}
          <div className="bg-[#243041] text-white text-center py-2 font-bold tracking-wide">
            รายงานบริการ / MAINTENANCE REPORT
          </div>

          {/* Form Details Grid */}
          <div className="border-b border-gray-400">
            {/* แถวที่ 1: Date & Start Time */}
            <div className="flex flex-col md:flex-row border-b border-gray-300">
              <div className="w-full md:w-1/2 flex items-center border-b md:border-b-0 md:border-r border-gray-300">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800">
                  Date :
                </span>
                <div className="flex-1 flex items-center pr-2">
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    className="flex-1 p-2 outline-none text-sm text-gray-600 bg-transparent w-full"
                  />
                </div>
              </div>
              <div className="w-full md:w-1/2 flex items-center">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800">
                  Start Time :
                </span>
                <div className="flex-1 flex items-center pr-2">
                  <input
                    type="time"
                    name="startTime"
                    value={formData.startTime}
                    onChange={handleInputChange}
                    className="flex-1 p-2 outline-none text-sm text-gray-600 bg-transparent w-full"
                  />
                </div>
              </div>
            </div>

            {/* แถวที่ 2: Customer & Finish Time */}
            <div className="flex flex-col md:flex-row border-b border-gray-300">
              <div className="w-full md:w-1/2 flex items-center border-b md:border-b-0 md:border-r border-gray-300">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800">
                  Customer :
                </span>
                <select
                  name="customer"
                  value={formData.customer}
                  onChange={handleInputChange}
                  className="flex-1 p-2 outline-none text-sm text-gray-600 bg-transparent cursor-pointer w-full"
                >
                  <option value="">-- เลือกบริษัทลูกค้า --</option>
                  <option value="Chiaopao">Chiaopao</option>
                  <option value="Taiyo">Taiyo</option>
                  <option value="Thaicheer">Thaicheer</option>
                  <option value="TTK">TTK</option>
                  <option value="Ph">Ph</option>
                  <option value="Wakologistics">Wakologistics</option>
                  <option value="Klaser">Klaser</option>
                </select>
              </div>
              <div className="w-full md:w-1/2 flex items-center">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800">
                  Finish Time :
                </span>
                <div className="flex-1 flex items-center pr-2">
                  <input
                    type="time"
                    name="finishTime"
                    value={formData.finishTime}
                    onChange={handleInputChange}
                    className="flex-1 p-2 outline-none text-sm text-gray-600 bg-transparent w-full"
                  />
                </div>
              </div>
            </div>

            {/* แถวที่ 3: IT Support & Location */}
            <div className="flex flex-col md:flex-row">
              <div className="w-full md:w-1/2 flex items-center border-b md:border-b-0 md:border-r border-gray-300 relative">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800 shrink-0">
                  IT Support :
                </span>
                <div
                  className="flex-1 p-2 text-sm text-gray-600 cursor-pointer min-h-[36px] flex items-center flex-wrap"
                  onClick={() => setIsItSupportOpen(!isItSupportOpen)}
                >
                  {formData.itSupport.length > 0 ? (
                    formData.itSupport.join(", ")
                  ) : (
                    <span className="text-gray-400">
                      -- เลือกชื่อผู้ปฏิบัติงาน --
                    </span>
                  )}
                </div>

                {isItSupportOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setIsItSupportOpen(false)}
                    ></div>
                    <div className="absolute top-full left-0 w-full bg-white border border-gray-300 shadow-lg z-20 rounded-b-md print:hidden">
                      {[
                        "Kittisak kongjaroensuksanti",
                        "Chatchon Siriphong",
                        "Teerapol Surasajja",
                      ].map((name) => (
                        <label
                          key={name}
                          className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-0"
                        >
                          <input
                            type="checkbox"
                            className="mr-3 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                            checked={formData.itSupport.includes(name)}
                            onChange={() => {
                              setFormData((prev) => {
                                const isSelected =
                                  prev.itSupport.includes(name);
                                const newItSupport = isSelected
                                  ? prev.itSupport.filter((n) => n !== name)
                                  : [...prev.itSupport, name];
                                return { ...prev, itSupport: newItSupport };
                              });
                            }}
                          />
                          {name}
                        </label>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <div className="w-full md:w-1/2 flex items-center">
                <span className="w-32 px-4 py-2 text-sm font-bold text-gray-800">
                  Location :
                </span>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  className="flex-1 p-2 outline-none text-sm text-gray-600 w-full"
                />
              </div>
            </div>
          </div>

          {/* เพิ่มช่องว่างประมาณ 2 บรรทัด */}
          <div className="h-8 w-full bg-white"></div>

          {/* --- Service Request Section --- */}
          <div className="bg-[#e9ecef] flex justify-between items-center p-2 border-y border-gray-400">
            {" "}
            <div className="flex items-center text-[#2b3c53] font-bold text-sm">
              <ClipboardList className="w-5 h-5 mr-2" />
              รายการแจ้งงาน (SERVICE REQUEST)
            </div>
            <button
              data-html2canvas-ignore="true"
              onClick={addServiceRequest}
              className="text-teal-600 hover:text-teal-800 print:hidden focus:outline-none"
            >
              <Plus className="w-6 h-6 bg-teal-600 text-white rounded-full p-1" />
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-white border-b border-gray-400">
                <tr>
                  <th className="border-r border-gray-300 p-2 w-16 text-center text-gray-800 font-bold">
                    NO.
                  </th>
                  <th className="border-r border-gray-300 p-2 w-1/3 text-center text-gray-800 font-bold">
                    Request Name
                  </th>
                  <th className="p-2 text-center text-gray-800 font-bold">
                    Description
                  </th>
                  <th
                    data-html2canvas-ignore="true"
                    className="w-10 print:hidden"
                  ></th>
                </tr>
              </thead>
              <tbody>
                {serviceRequests.map((req, index) => (
                  <tr key={req.id} className="border-b border-gray-200">
                    <td className="border-r border-gray-300 p-2 text-center font-medium align-top pt-3">
                      {index + 1}
                    </td>
                    <td className="border-r border-gray-300 p-0 relative align-top">
                      <textarea
                        value={req.name}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                          updateServiceRequest(req.id, "name", e.target.value);
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                          }
                        }}
                        placeholder="ชื่อผู้แจ้ง"
                        rows={1}
                        className="w-full p-2 outline-none bg-transparent placeholder-gray-400 resize-none overflow-hidden block leading-relaxed"
                      />
                    </td>
                    <td className="p-0 relative align-top">
                      <textarea
                        value={req.description}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                          updateServiceRequest(
                            req.id,
                            "description",
                            e.target.value,
                          );
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                          }
                        }}
                        placeholder="เช่น: เครื่องเปิดไม่ติด, เน็ตหลุดบ่อย..."
                        rows={1}
                        className="w-full p-2 outline-none bg-transparent placeholder-gray-400 resize-none overflow-hidden block leading-relaxed"
                      />
                    </td>
                    <td
                      data-html2canvas-ignore="true"
                      className="p-2 text-center print:hidden align-top pt-3"
                    >
                      <button
                        onClick={() => removeServiceRequest(req.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Action Button Wrapper (Ignored in PDF) */}
          <div
            data-html2canvas-ignore="true"
            className="relative py-6 bg-emerald-50/30 border-b border-gray-400 print:hidden flex flex-col items-center justify-center"
          >
            <button
              onClick={generateAIReport}
              disabled={isGenerating}
              className={`${
                isGenerating
                  ? "bg-emerald-400 cursor-not-allowed"
                  : "bg-emerald-600 hover:bg-emerald-700 transform hover:scale-105 shadow-md"
              } text-white px-8 py-3 rounded-full font-medium flex items-center transition-all`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  กำลังวิเคราะห์และเขียนรายงาน...
                </>
              ) : (
                <>✨ ให้ AI ช่วยเขียนรายละเอียดการแก้ไข ✨</>
              )}
            </button>

            {aiError && (
              <div className="mt-3 flex items-center text-red-600 text-sm bg-red-50 px-3 py-1.5 rounded-md border border-red-100">
                <AlertCircle className="w-4 h-4 mr-2 shrink-0" />
                {aiError}
              </div>
            )}
          </div>
          {/* เพิ่มช่องว่าง 2 บรรทัดเฉพาะตอนพิมพ์ (คั่นก่อนถึงตารางผลการซ่อม) */}
          <div className="hidden print:block h-8 w-full bg-white"></div>

          {/* --- Service Report Section --- */}
          <div className="bg-[#e9ecef] flex justify-between items-center p-2 border-y border-gray-400">
            <div className="flex items-center text-[#2b3c53] font-bold text-sm">
              <MonitorSmartphone className="w-5 h-5 mr-2" />
              รายการให้บริการ แยกตามชื่อคอมพิวเตอร์ (SERVICE REPORT BY COMPUTER
              NAME)
            </div>
            <button
              data-html2canvas-ignore="true"
              onClick={addServiceReport}
              className="text-teal-600 hover:text-teal-800 print:hidden focus:outline-none"
            >
              <Plus className="w-6 h-6 bg-teal-600 text-white rounded-full p-1" />
            </button>
          </div>

          <div className="overflow-x-auto w-full">
            <table className="w-full text-sm text-left min-w-[600px]">
              <thead className="bg-white border-b border-gray-400">
                <tr>
                  <th className="border-r border-gray-300 p-2 w-16 text-center text-gray-800 font-bold">
                    NO.
                  </th>
                  <th className="border-r border-gray-300 p-2 w-1/3 text-center text-gray-800 font-bold">
                    Computer Name
                  </th>
                  <th className="p-2 text-center text-gray-800 font-bold">
                    Description
                  </th>
                  <th
                    data-html2canvas-ignore="true"
                    className="w-10 print:hidden"
                  ></th>
                </tr>
              </thead>
              <tbody>
                {serviceReports.map((rep, index) => (
                  <tr key={rep.id} className="border-b border-gray-300">
                    <td className="border-r border-gray-300 p-2 text-center font-medium align-top pt-4">
                      {index + 1}
                    </td>
                    <td className="border-r border-gray-300 p-0 relative align-top">
                      <textarea
                        value={rep.computerName}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                          updateServiceReport(
                            rep.id,
                            "computerName",
                            e.target.value,
                          );
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                          }
                        }}
                        placeholder="ชื่อเครื่อง"
                        rows={1}
                        className="w-full p-2 outline-none bg-transparent placeholder-gray-400 resize-none overflow-hidden block leading-relaxed mt-1"
                      />
                    </td>
                    <td className="p-0 relative align-top">
                      <textarea
                        value={rep.description}
                        onChange={(e) => {
                          e.target.style.height = "auto";
                          e.target.style.height = e.target.scrollHeight + "px";
                          updateServiceReport(
                            rep.id,
                            "description",
                            e.target.value,
                          );
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = "auto";
                            el.style.height = el.scrollHeight + "px";
                          }
                        }}
                        placeholder="AI จะช่วยสรุปที่นี่ หรือคุณสามารถพิมพ์เองได้..."
                        rows={1}
                        className={`w-full min-h-[64px] p-2 outline-none bg-transparent placeholder-gray-400 resize-none overflow-hidden block leading-relaxed ${isGenerating ? "animate-pulse bg-gray-50" : ""}`}
                      />
                    </td>
                    <td
                      data-html2canvas-ignore="true"
                      className="p-2 text-center print:hidden align-top pt-4"
                    >
                      <button
                        onClick={() => removeServiceReport(rep.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer / Signatures */}
          <div className="flex flex-col md:flex-row bg-white min-h-[160px] mt-auto border-t border-gray-400">
            {/* Customer Signature */}
            <div className="w-full md:w-1/4 border-b md:border-b-0 md:border-r border-gray-400 p-4 flex flex-col items-center justify-between min-h-[120px]">
              <span className="font-bold text-sm text-gray-800 mt-2 underline">
                Customer Signature
              </span>
              <div className="w-full mt-auto mb-2">
                <div className="border-b border-dashed border-gray-400 w-full mb-1"></div>
              </div>
            </div>

            {/* Technician Signature */}
            <div className="w-full md:w-1/4 border-b md:border-b-0 md:border-r border-gray-400 p-4 flex flex-col items-center justify-between relative min-h-[120px]">
              <span className="font-bold text-sm text-gray-800 mt-2 underline">
                Technician Signature
              </span>

              <div className="w-full mt-auto mb-2 cursor-pointer relative" onClick={() => setIsTechSigOpen(!isTechSigOpen)}>
                <div className="min-h-[24px] text-center text-sm text-gray-700 font-medium mb-1">
                  {(formData.technicianSignature || []).length > 0 ? formData.technicianSignature.join(", ") : ""}
                </div>
                <div className="border-b border-dashed border-gray-400 w-full mb-1"></div>
                {(formData.technicianSignature || []).length === 0 && (
                  <div className="text-center text-xs text-gray-400 print:hidden mt-1">(คลิกเพื่อเลือกชื่อ)</div>
                )}
              </div>

              {/* Technician Signature Dropdown Menu */}
              {isTechSigOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsTechSigOpen(false)}></div>
                  <div className="absolute bottom-full left-0 md:bottom-[60px] md:left-[-20%] w-full md:w-[250px] bg-white border border-gray-300 shadow-lg z-20 rounded-md print:hidden">
                    {["Kittisak kongjaroensuksanti", "Chatchon Siriphong", "Teerapol Surasajja"].map((name) => (
                      <label key={name} className="flex items-center px-4 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-0">
                        <input type="checkbox" className="mr-3 w-4 h-4 text-teal-600 rounded border-gray-300 focus:ring-teal-500" checked={(formData.technicianSignature || []).includes(name)} onChange={() => { setFormData((prev) => { const currentSigs = prev.technicianSignature || []; const isSelected = currentSigs.includes(name); const newTechSig = isSelected ? currentSigs.filter((n) => n !== name) : [...currentSigs, name]; return { ...prev, technicianSignature: newTechSig }; }); }} />
                        {name}
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Remarks */}
            <div className="w-full md:w-2/4 p-4 text-[10px] md:text-xs text-gray-700 leading-tight flex items-center">
              <div>
                <p className="font-bold mb-1 underline text-black">หมายเหตุ:</p>
                <p className="text-justify">
                  ทางบริษัทขอสงวนสิทธิ์การให้บริการโดยถ้ามีความผิดพลาดทางระบบปฏิบัติการ
                  ทางบริษัทจะชดใช้โดยการลงโปรแกรมนั้นๆ ให้ใหม่ในกรณีที่มีต้นฉบับของโปรแกรมนั้นๆ
                  และสามารถติดต่อเจ้าของโปรแกรมได้ ความรับผิดชอบนี้ไม่รวมถึงข้อมูลภายในของลูกค้า
                  ที่ต้องทำการสำรองข้อมูลที่สำคัญก่อนมาใช้บริการ ในกรณีที่เครื่องเปิดไม่ติด
                  ทางบริษัทจะทำการสำรองข้อมูลที่ลูกค้าแจ้งในตำแหน่งที่มองเห็นได้เท่านั้น
                  และจะไม่รับผิดชอบต่อการผิดพลาดของข้อมูลที่สำรองไว้ในทุกกรณี
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {/* Custom Modal for Clear All History */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <div className="flex items-center text-red-600 mb-4">
              <AlertCircle className="w-6 h-6 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">
                ยืนยันการล้างข้อมูล
              </h3>
            </div>
            <p className="text-gray-600 mb-6">
              คุณต้องการล้างประวัติบันทึกทั้งหมดใช่หรือไม่?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={isClearingAll}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md font-medium transition-colors"
              >
                ไม่
              </button>
              <button
                onClick={confirmClearAllHistory}
                disabled={isClearingAll}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-md font-medium flex items-center transition-colors"
              >
                {isClearingAll ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                ใช่
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
