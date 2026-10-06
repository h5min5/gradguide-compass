import rawCourses from "../../data/courses.json";
import type { Course } from "./types";

export function getCourses(): Course[] {
  return rawCourses as unknown as Course[];
}
