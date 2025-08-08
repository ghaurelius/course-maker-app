import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { db } from "../firebase";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  // orderBy, // Remove this unused import
  serverTimestamp,
} from "firebase/firestore";

const EnrollmentContext = createContext();

export function useEnrollment() {
  return useContext(EnrollmentContext);
}

export function EnrollmentProvider({ children }) {
  const { currentUser } = useAuth();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Enroll in a course
  const enrollInCourse = async (courseId, courseTitle) => {
    if (!currentUser) return false;

    try {
      // Check if already enrolled
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId),
      );
      const existingEnrollment = await getDocs(enrollmentQuery);

      if (!existingEnrollment.empty) {
        alert("You are already enrolled in this course!");
        return false;
      }

      // Create enrollment record
      await addDoc(collection(db, "enrollments"), {
        userId: currentUser.uid,
        courseId: courseId,
        courseTitle: courseTitle,
        enrolledAt: serverTimestamp(),
        progress: {
          completedLessons: [],
          currentModule: 0,
          currentLesson: 0,
          completionPercentage: 0,
        },
        status: "active",
      });

      // Refresh enrolled courses
      await fetchEnrolledCourses();
      return true;
    } catch (error) {
      console.error("Error enrolling in course:", error);
      return false;
    }
  };

  // Unenroll from a course
  const unenrollFromCourse = async (courseId) => {
    if (!currentUser) return false;

    try {
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId),
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      if (!enrollmentSnapshot.empty) {
        const enrollmentDoc = enrollmentSnapshot.docs[0];
        await deleteDoc(doc(db, "enrollments", enrollmentDoc.id));

        // Remove progress records
        const progressQuery = query(
          collection(db, "progress"),
          where("userId", "==", currentUser.uid),
          where("courseId", "==", courseId),
        );
        const progressSnapshot = await getDocs(progressQuery);

        const deletePromises = progressSnapshot.docs.map((doc) =>
          deleteDoc(doc.ref),
        );
        await Promise.all(deletePromises);

        await fetchEnrolledCourses();
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error unenrolling from course:", error);
      return false;
    }
  };

  // Check if user is enrolled in a course
  const isEnrolled = async (courseId) => {
    if (!currentUser) return false;

    try {
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId),
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      return !enrollmentSnapshot.empty;
    } catch (error) {
      console.error("Error checking enrollment:", error);
      return false;
    }
  };

  // Update lesson progress
  const updateLessonProgress = async (courseId, moduleIndex, lessonIndex) => {
    if (!currentUser) return false;

    try {
      // Get enrollment record
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId),
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      if (enrollmentSnapshot.empty) return false;

      const enrollmentDoc = enrollmentSnapshot.docs[0];
      const enrollmentData = enrollmentDoc.data();

      // Update progress
      const lessonId = `${moduleIndex}-${lessonIndex}`;
      const completedLessons = enrollmentData.progress.completedLessons || [];

      if (!completedLessons.includes(lessonId)) {
        completedLessons.push(lessonId);

        // Get course data to calculate completion percentage
        const courseDoc = await getDoc(doc(db, "courses", courseId));
        const courseData = courseDoc.data();

        let totalLessons = 0;
        courseData.modules.forEach((module) => {
          totalLessons += module.lessons.length;
        });

        const completionPercentage = Math.round(
          (completedLessons.length / totalLessons) * 100,
        );

        await updateDoc(doc(db, "enrollments", enrollmentDoc.id), {
          "progress.completedLessons": completedLessons,
          "progress.currentModule": moduleIndex,
          "progress.currentLesson": lessonIndex,
          "progress.completionPercentage": completionPercentage,
          "progress.lastAccessedAt": serverTimestamp(),
        });

        // If course is completed, create certificate
        if (completionPercentage === 100) {
          await createCertificate(courseId, courseData.title);
        }

        return true;
      }
      return false;
    } catch (error) {
      console.error("Error updating lesson progress:", error);
      return false;
    }
  };

  // Create completion certificate
  const createCertificate = async (courseId, courseTitle) => {
    try {
      await addDoc(collection(db, "certificates"), {
        userId: currentUser.uid,
        courseId: courseId,
        courseTitle: courseTitle,
        completedAt: serverTimestamp(),
        certificateId: `CERT-${Date.now()}-${currentUser.uid.slice(-6)}`,
      });
    } catch (error) {
      console.error("Error creating certificate:", error);
    }
  };

  // Fetch user's enrolled courses
  // Add useCallback to prevent infinite re-renders
  const fetchEnrolledCourses = useCallback(async () => {
    if (!currentUser) {
      setEnrolledCourses([]);
      setLoading(false);
      return;
    }

    try {
      // Around line 212-216, replace the query with:
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid)
        // Remove orderBy to avoid needing an index
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);
      
      // Sort the results in JavaScript instead
      const sortedDocs = enrollmentSnapshot.docs.sort((a, b) => {
        const aTime = a.data().enrolledAt?.toDate() || new Date(0);
        const bTime = b.data().enrolledAt?.toDate() || new Date(0);
        return bTime - aTime; // Descending order
      });
      
      const enrollmentsData = [];
      for (const enrollmentDoc of sortedDocs) {
        const enrollmentData = {
          id: enrollmentDoc.id,
          ...enrollmentDoc.data(),
        };

        // Get course details
        try {
          const courseDoc = await getDoc(
            doc(db, "courses", enrollmentData.courseId),
          );
          if (courseDoc.exists()) {
            enrollmentData.courseDetails = {
              id: courseDoc.id,
              ...courseDoc.data(),
            };
          }
        } catch (error) {
          console.error("Error fetching course details:", error);
        }

        enrollmentsData.push(enrollmentData);
      }

      setEnrolledCourses(enrollmentsData);
    } catch (error) {
      console.error("Error fetching enrolled courses:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]); // Add currentUser as dependency

  // If there's another useEffect around line 291-292, it should be:
  useEffect(() => {
    fetchEnrolledCourses();
  }, [fetchEnrolledCourses]); // Add fetchEnrolledCourses as dependency

  // Get enrollment details for a specific course
  const getEnrollmentDetails = async (courseId) => {
    if (!currentUser) return null;

    try {
      const enrollmentQuery = query(
        collection(db, "enrollments"),
        where("userId", "==", currentUser.uid),
        where("courseId", "==", courseId),
      );
      const enrollmentSnapshot = await getDocs(enrollmentQuery);

      if (!enrollmentSnapshot.empty) {
        return {
          id: enrollmentSnapshot.docs[0].id,
          ...enrollmentSnapshot.docs[0].data(),
        };
      }
      return null;
    } catch (error) {
      console.error("Error getting enrollment details:", error);
      return null;
    }
  };

  useEffect(() => {
    fetchEnrolledCourses();
  }, [currentUser]);

  const value = {
    enrolledCourses,
    loading,
    enrollInCourse,
    unenrollFromCourse,
    isEnrolled,
    updateLessonProgress,
    getEnrollmentDetails,
    fetchEnrolledCourses,
  };

  return (
    <EnrollmentContext.Provider value={value}>
      {children}
    </EnrollmentContext.Provider>
  );
}
