export type MuscleGroup =
  | "Chest"
  | "Back"
  | "Shoulders"
  | "Biceps"
  | "Triceps"
  | "Legs"
  | "Glutes"
  | "Calves"
  | "Core"
  | "Full Body";

export type Equipment =
  | "Barbell"
  | "Dumbbell"
  | "Cable"
  | "Machine"
  | "Kettlebell"
  | "Bodyweight"
  | "Smith Machine"
  | "Resistance Band";

export type ExerciseType = "Compound" | "Isolation";

export interface Exercise {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  type: ExerciseType;
  instructions: string;
}

export interface TemplateSetConfig {
  targetReps: number;
  targetWeight: number; // stored in kg, 0 = bodyweight
  restSec: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  name: string;
  sets: TemplateSetConfig[];
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: WorkoutExercise[];
  favorite: boolean;
  createdAt: number;
  lastPerformedAt: number | null;
}

export type PRType = "max-weight" | "best-1rm" | "best-set-volume";

export interface SetRecord {
  weight: number; // kg
  reps: number;
  completedAt: number;
}

export interface SessionExercise {
  exerciseId: string;
  name: string;
  restSec: number;
  targetSets: number;
  sets: SetRecord[];
}

export interface WorkoutSession {
  id: string;
  templateId: string | null;
  templateName: string | null;
  startedAt: number;
  endedAt: number | null;
  exercises: SessionExercise[];
  notes?: string;
  prCount: number;
}

export interface PersonalRecord {
  id: string;
  exerciseId: string;
  exerciseName: string;
  type: PRType;
  weight: number;
  reps: number;
  estimated1RM: number;
  volume: number;
  sessionId: string;
  date: number;
}

export type UnitSystem = "kg" | "lb";
export type ThemeMode = "light" | "dark" | "system";
export type TrainingGoal =
  | "Build Muscle"
  | "Get Stronger"
  | "Lose Weight"
  | "General Fitness"
  | "Improve Endurance";

export interface UserProfile {
  name: string;
  age: number | null;
  heightCm: number | null;
  bodyWeightKg: number | null;
  goal: TrainingGoal | null;
}
