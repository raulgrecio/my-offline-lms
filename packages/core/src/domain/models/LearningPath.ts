export interface LearningPath {
  id: string;
  slug: string;
  title: string;
  description: string;
}

export interface LearningPathCourse {
  pathId: string;
  courseId: string;
  orderIndex: number;
}
