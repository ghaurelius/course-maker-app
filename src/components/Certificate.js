import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../firebase";
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { useAuth } from "../contexts/AuthContext";

function Certificate() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [certificate, setCertificate] = useState(null);
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCertificate = async () => {
      if (!currentUser) {
        navigate("/login");
        return;
      }

      try {
        // Fetch certificate
        const certificateQuery = query(
          collection(db, "certificates"),
          where("userId", "==", currentUser.uid),
          where("courseId", "==", courseId),
        );
        const certificateSnapshot = await getDocs(certificateQuery);

        if (certificateSnapshot.empty) {
          alert("Certificate not found. Please complete the course first.");
          navigate("/enrolled-courses");
          return;
        }

        const certificateData = {
          id: certificateSnapshot.docs[0].id,
          ...certificateSnapshot.docs[0].data(),
        };
        setCertificate(certificateData);

        // Fetch course details
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        if (courseDoc.exists()) {
          setCourse({ id: courseDoc.id, ...courseDoc.data() });
        }
      } catch (error) {
        console.error("Error fetching certificate:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCertificate();
  }, [courseId, currentUser, navigate]);

  const formatDate = (timestamp) => {
    if (!timestamp) return "Unknown";
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = () => {
    // In a real app, you'd generate a PDF here
    alert(
      "PDF download feature would be implemented here using libraries like jsPDF or Puppeteer.",
    );
  };

  if (loading) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Loading certificate...</h2>
      </div>
    );
  }

  if (!certificate || !course) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>Certificate not found</h2>
        <button onClick={() => navigate("/enrolled-courses")}>
          Back to Enrolled Courses
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      {/* Action Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          "@media print": { display: "none" },
        }}
      >
        <button
          onClick={() => navigate("/enrolled-courses")}
          style={{
            backgroundColor: "#6c757d",
            color: "white",
            border: "none",
            padding: "10px 20px",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px",
          }}
        >
          ← Back to Courses
        </button>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={handlePrint}
            style={{
              backgroundColor: "#007bff",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            🖨️ Print
          </button>

          <button
            onClick={handleDownload}
            style={{
              backgroundColor: "#28a745",
              color: "white",
              border: "none",
              padding: "10px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "14px",
            }}
          >
            📥 Download PDF
          </button>
        </div>
      </div>

      {/* Certificate */}
      <div
        style={{
          backgroundColor: "white",
          border: "3px solid #007bff",
          borderRadius: "15px",
          padding: "60px 40px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative Border */}
        <div
          style={{
            position: "absolute",
            top: "15px",
            left: "15px",
            right: "15px",
            bottom: "15px",
            border: "2px solid #ffc107",
            borderRadius: "10px",
            pointerEvents: "none",
          }}
        />

        {/* Header */}
        <div style={{ marginBottom: "40px" }}>
          <h1
            style={{
              fontSize: "48px",
              color: "#007bff",
              margin: "0 0 10px 0",
              fontFamily: "serif",
              textShadow: "2px 2px 4px rgba(0,0,0,0.1)",
            }}
          >
            🏆 Certificate of Completion
          </h1>
          <div
            style={{
              width: "200px",
              height: "3px",
              backgroundColor: "#ffc107",
              margin: "0 auto",
            }}
          />
        </div>

        {/* Content */}
        <div style={{ marginBottom: "40px", lineHeight: "1.8" }}>
          <p
            style={{
              fontSize: "20px",
              color: "#333",
              margin: "0 0 30px 0",
            }}
          >
            This is to certify that
          </p>

          <h2
            style={{
              fontSize: "36px",
              color: "#007bff",
              margin: "0 0 30px 0",
              fontFamily: "serif",
              borderBottom: "2px solid #007bff",
              paddingBottom: "10px",
              display: "inline-block",
            }}
          >
            Student #{currentUser.uid.slice(-8)}
          </h2>

          <p
            style={{
              fontSize: "20px",
              color: "#333",
              margin: "0 0 20px 0",
            }}
          >
            has successfully completed the course
          </p>

          <h3
            style={{
              fontSize: "28px",
              color: "#28a745",
              margin: "0 0 30px 0",
              fontStyle: "italic",
            }}
          >
            "{course.title}"
          </h3>

          <p
            style={{
              fontSize: "18px",
              color: "#666",
              margin: "0",
            }}
          >
            Completed on {formatDate(certificate.completedAt)}
          </p>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "end",
            marginTop: "60px",
            paddingTop: "30px",
            borderTop: "1px solid #ddd",
          }}
        >
          <div style={{ textAlign: "left" }}>
            <div
              style={{
                borderBottom: "2px solid #333",
                width: "200px",
                marginBottom: "10px",
              }}
            />
            <p
              style={{
                fontSize: "14px",
                color: "#666",
                margin: "0",
              }}
            >
              Course Creator
            </p>
          </div>

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                backgroundColor: "#007bff",
                color: "white",
                padding: "10px 20px",
                borderRadius: "25px",
                fontSize: "14px",
                fontWeight: "bold",
              }}
            >
              Certificate ID: {certificate.certificateId}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                borderBottom: "2px solid #333",
                width: "200px",
                marginBottom: "10px",
              }}
            />
            <p
              style={{
                fontSize: "14px",
                color: "#666",
                margin: "0",
              }}
            >
              Date Issued
            </p>
          </div>
        </div>

        {/* Decorative Elements */}
        <div
          style={{
            position: "absolute",
            top: "30px",
            left: "30px",
            fontSize: "24px",
            color: "#ffc107",
            opacity: 0.3,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: "absolute",
            top: "30px",
            right: "30px",
            fontSize: "24px",
            color: "#ffc107",
            opacity: 0.3,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "30px",
            fontSize: "24px",
            color: "#ffc107",
            opacity: 0.3,
          }}
        >
          ⭐
        </div>
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            right: "30px",
            fontSize: "24px",
            color: "#ffc107",
            opacity: 0.3,
          }}
        >
          ⭐
        </div>
      </div>

      {/* Certificate Info */}
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#f8f9fa",
          borderRadius: "8px",
          fontSize: "14px",
          color: "#666",
          "@media print": { display: "none" },
        }}
      >
        <h4 style={{ margin: "0 0 10px 0", color: "#333" }}>
          Certificate Details
        </h4>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "10px",
          }}
        >
          <div>
            <strong>Course:</strong> {course.title}
          </div>
          <div>
            <strong>Completed:</strong> {formatDate(certificate.completedAt)}
          </div>
          <div>
            <strong>Certificate ID:</strong> {certificate.certificateId}
          </div>
          <div>
            <strong>Difficulty:</strong> {course.difficulty || "beginner"}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Certificate;
