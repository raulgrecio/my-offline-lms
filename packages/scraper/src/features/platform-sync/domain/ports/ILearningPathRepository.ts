import { LearningPath, LearningPathCourse } from '../models/LearningPath';
import { Course } from '../models/Course';

export interface ILearningPathRepository {
  /** Save or update a Learning Path */
  saveLearningPath(path: LearningPath): void;
  
  /** Find a Learning Path by ID */
  getLearningPathById(id: string): LearningPath | null;
  
  /** Get all courses ordered by index for a specific path */
  getCoursesForPath(pathId: string): (Course & { orderIndex: number })[];
  
  /** Link a course to a path with an order index */
  addCourseToPath(link: LearningPathCourse): void;
}
