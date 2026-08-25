import type { Exercise, Equipment, MuscleGroup } from "../types";

type Seed = {
  name: string;
  m: MuscleGroup;
  s?: MuscleGroup[];
  e: Equipment;
  t?: "Compound" | "Isolation";
  i: string;
};

const SEEDS: Seed[] = [
  // Chest
  { name: "Bench Press", m: "Chest", s: ["Triceps", "Shoulders"], e: "Barbell", t: "Compound", i: "Lie on bench, grip slightly wider than shoulders. Lower bar to mid-chest, then press up until arms lock out." },
  { name: "Incline Bench Press", m: "Chest", s: ["Shoulders", "Triceps"], e: "Barbell", t: "Compound", i: "Set bench to 30–45°. Lower the bar to your upper chest and press up." },
  { name: "Dumbbell Bench Press", m: "Chest", s: ["Triceps", "Shoulders"], e: "Dumbbell", t: "Compound", i: "Press two dumbbells from chest level until arms are extended, keeping wrists straight." },
  { name: "Incline Dumbbell Press", m: "Chest", s: ["Shoulders", "Triceps"], e: "Dumbbell", t: "Compound", i: "On an incline bench, press dumbbells up and slightly together at the top." },
  { name: "Cable Fly", m: "Chest", s: ["Shoulders"], e: "Cable", t: "Isolation", i: "With cables set at chest height, bring hands together in a hugging arc with a slight elbow bend." },
  { name: "Pec Deck", m: "Chest", s: [], e: "Machine", t: "Isolation", i: "Sit with back against pad and bring handles together in front of chest. Control the return." },
  { name: "Push Up", m: "Chest", s: ["Triceps", "Core"], e: "Bodyweight", t: "Compound", i: "Keep body in a straight line, lower chest toward the floor, then push back up." },

  // Back
  { name: "Deadlift", m: "Back", s: ["Legs", "Glutes", "Core"], e: "Barbell", t: "Compound", i: "Hinge at hips with a flat back, grip the bar, drive through the floor and stand tall." },
  { name: "Lat Pulldown", m: "Back", s: ["Biceps"], e: "Cable", t: "Compound", i: "Pull the bar down to your upper chest while squeezing shoulder blades down and back." },
  { name: "Pull Up", m: "Back", s: ["Biceps", "Core"], e: "Bodyweight", t: "Compound", i: "Hang with an overhand grip and pull until your chin clears the bar." },
  { name: "Barbell Row", m: "Back", s: ["Biceps", "Core"], e: "Barbell", t: "Compound", i: "Hinge to ~45°, pull the bar to your lower ribs, keep your torso stable." },
  { name: "Seated Cable Row", m: "Back", s: ["Biceps"], e: "Cable", t: "Compound", i: "Pull the handle to your stomach with elbows close to the body; squeeze at the back." },
  { name: "Dumbbell Row", m: "Back", s: ["Biceps"], e: "Dumbbell", t: "Compound", i: "Brace on a bench, row the dumbbell to your hip keeping your back flat." },

  // Shoulders
  { name: "Overhead Press", m: "Shoulders", s: ["Triceps", "Core"], e: "Barbell", t: "Compound", i: "From shoulder height, press the bar overhead until arms are fully extended." },
  { name: "Dumbbell Shoulder Press", m: "Shoulders", s: ["Triceps"], e: "Dumbbell", t: "Compound", i: "Press dumbbells from shoulder height overhead without arching your lower back." },
  { name: "Lateral Raise", m: "Shoulders", s: [], e: "Dumbbell", t: "Isolation", i: "Raise dumbbells out to the sides to shoulder height with a slight elbow bend." },
  { name: "Front Raise", m: "Shoulders", s: [], e: "Dumbbell", t: "Isolation", i: "Raise dumbbells straight in front of you to shoulder height." },
  { name: "Face Pull", m: "Shoulders", s: ["Back"], e: "Cable", t: "Isolation", i: "Pull a rope attachment toward your face, separating hands beside your ears." },

  // Legs
  { name: "Squat", m: "Legs", s: ["Glutes", "Core"], e: "Barbell", t: "Compound", i: "Unrack the bar, squat until hips pass below knees while keeping chest up, then drive up." },
  { name: "Front Squat", m: "Legs", s: ["Core", "Glutes"], e: "Barbell", t: "Compound", i: "Rest the bar on your front delts, squat deep keeping elbows high." },
  { name: "Leg Press", m: "Legs", s: ["Glutes"], e: "Machine", t: "Compound", i: "Push the platform away until legs extend without locking knees; control the descent." },
  { name: "Romanian Deadlift", m: "Legs", s: ["Glutes", "Back"], e: "Barbell", t: "Compound", i: "Hinge at hips with soft knees, lower the bar along your thighs until you feel a hamstring stretch." },
  { name: "Leg Extension", m: "Legs", s: [], e: "Machine", t: "Isolation", i: "Extend knees to lift the pad until legs are straight; squeeze the quads at the top." },
  { name: "Leg Curl", m: "Legs", s: ["Glutes"], e: "Machine", t: "Isolation", i: "Curl your heels toward your glutes and control the return." },
  { name: "Bulgarian Split Squat", m: "Legs", s: ["Glutes", "Core"], e: "Dumbbell", t: "Compound", i: "Rear foot elevated on a bench, lower until the front thigh is parallel to the floor." },
  { name: "Goblet Squat", m: "Legs", s: ["Glutes", "Core"], e: "Kettlebell", t: "Compound", i: "Hold a kettlebell at chest height and squat between your knees keeping torso upright." },

  // Glutes
  { name: "Hip Thrust", m: "Glutes", s: ["Legs"], e: "Barbell", t: "Compound", i: "Drive hips upward until your body forms a straight line from shoulders to knees." },
  { name: "Glute Bridge", m: "Glutes", s: ["Legs", "Core"], e: "Bodyweight", t: "Isolation", i: "Lie on your back, feet flat, and lift hips by squeezing the glutes." },

  // Calves
  { name: "Standing Calf Raise", m: "Calves", s: [], e: "Machine", t: "Isolation", i: "Rise onto the balls of your feet as high as possible, pause, then lower slowly." },
  { name: "Seated Calf Raise", m: "Calves", s: [], e: "Machine", t: "Isolation", i: "Push through the balls of your feet with knees bent at 90°." },

  // Biceps
  { name: "Barbell Curl", m: "Biceps", s: [], e: "Barbell", t: "Isolation", i: "Curl the bar from hip height to shoulder height without swinging." },
  { name: "Dumbbell Curl", m: "Biceps", s: [], e: "Dumbbell", t: "Isolation", i: "Curl both dumbbells, rotating palms up as you lift." },
  { name: "Hammer Curl", m: "Biceps", s: [], e: "Dumbbell", t: "Isolation", i: "Curl with a neutral (thumbs-up) grip, keeping elbows pinned." },
  { name: "Preacher Curl", m: "Biceps", s: [], e: "Dumbbell", t: "Isolation", i: "With upper arms fixed on the pad, curl to the top and lower slowly." },

  // Triceps
  { name: "Triceps Pushdown", m: "Triceps", s: [], e: "Cable", t: "Isolation", i: "Push the bar down until arms are fully extended, elbows tight to sides." },
  { name: "Skull Crusher", m: "Triceps", s: [], e: "Barbell", t: "Isolation", i: "Lower the bar toward your forehead by bending elbows, then extend back up." },
  { name: "Overhead Triceps Extension", m: "Triceps", s: [], e: "Dumbbell", t: "Isolation", i: "Lower a dumbbell behind your head, then extend overhead." },
  { name: "Close-Grip Bench Press", m: "Triceps", s: ["Chest"], e: "Barbell", t: "Compound", i: "Bench press with a shoulder-width grip, elbows tucked." },

  // Core
  { name: "Plank", m: "Core", s: ["Shoulders"], e: "Bodyweight", t: "Isolation", i: "Hold a straight-body position on forearms. Log seconds held as reps." },
  { name: "Crunch", m: "Core", s: [], e: "Bodyweight", t: "Isolation", i: "Curl shoulder blades off the floor using the abs; avoid pulling the neck." },
  { name: "Hanging Leg Raise", m: "Core", s: [], e: "Bodyweight", t: "Isolation", i: "Hang from a bar and raise legs to hip height or higher with control." },
  { name: "Cable Crunch", m: "Core", s: [], e: "Cable", t: "Isolation", i: "Kneel below a cable and crunch downward, bringing elbows toward knees." },

  // Full Body
  { name: "Kettlebell Swing", m: "Full Body", s: ["Glutes", "Back"], e: "Kettlebell", t: "Compound", i: "Hinge and snap hips forward to swing the kettlebell to chest height." },
  { name: "Burpee", m: "Full Body", s: ["Chest", "Legs", "Core"], e: "Bodyweight", t: "Compound", i: "From standing, drop to a push-up, then jump explosively back to standing." },
];

let counter = 0;
function makeId(name: string): string {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `ex-${slug}-${++counter}`;
}

export const SEED_EXERCISES: Exercise[] = SEEDS.map((s) => ({
  id: makeId(s.name),
  name: s.name,
  muscleGroup: s.m,
  secondaryMuscles: s.s ?? [],
  equipment: s.e,
  type: s.t ?? "Compound",
  instructions: s.i,
}));

export const MUSCLE_GROUPS: MuscleGroup[] = [
  "Chest", "Back", "Shoulders", "Biceps", "Triceps",
  "Legs", "Glutes", "Calves", "Core", "Full Body",
];

export const EQUIPMENT_TYPES: Equipment[] = [
  "Barbell", "Dumbbell", "Cable", "Machine",
  "Kettlebell", "Bodyweight", "Smith Machine", "Resistance Band",
];
