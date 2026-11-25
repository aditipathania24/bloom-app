import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { supabase } from "./services/supabase";

/* ---------------------------------------------------------
   BLOOM — a cycle tracker
   Blossom Pink #FF6B9D · Sunset Coral #FF9770
   Sunny Yolk  #FFD23F · Lavender Bud #B892FF
   Cloud #FFF9F5 · Ink Plum #3D1F3D
   Phases: Menstrual #E63462 · Follicular #3EC9B0
           Ovulation #FFC93C · Luteal #9B72CF
--------------------------------------------------------- */

const PHASES = {
  menstrual: { name: "Menstrual", color: "#E63462", soft: "#FDE3EA", emoji: "🌸" },
  follicular: { name: "Follicular", color: "#3EC9B0", soft: "#E1F7F3", emoji: "🌱" },
  ovulation: { name: "Ovulation", color: "#FFC93C", soft: "#FFF6DC", emoji: "☀️" },
  luteal: { name: "Luteal", color: "#9B72CF", soft: "#F1E9FB", emoji: "🌙" },
};

const HEALTH_OPTIONS = ["PCOS/PCOD", "Thyroid condition", "Irregular cycles", "Endometriosis", "Other"];
const SLEEP_OPTIONS = ["<5 hrs", "5–7 hrs", "7–9 hrs", "9+ hrs"];
const STRESS_OPTIONS = ["Low", "Moderate", "High"];
const ACTIVITY_OPTIONS = ["Sedentary", "Lightly active", "Very active"];
const DIET_OPTIONS = ["No preference", "Vegetarian", "Eggetarian", "Vegan", "Non-vegetarian"];

// Each food item carries diet tags (nonveg/egg/dairy = true if it contains that)
// plus approximate kcal/protein(g) for one serving. Nutrition numbers are
// ballpark educational estimates, not lab-measured values — real dishes vary
// by portion and recipe, which is why the UI labels them "approx."
// Pools are 8 items deep per meal per phase so filtering down to Vegan (the
// strictest diet) still leaves 5+ genuinely different, non-repetitive options.
const FALLBACK_DATA = {
  menstrual: {
    dailySteps: "4,000–6,000 steps (gentle movement — rest is more valuable than hitting a number this week)",
    breakfast: [
      { name: "Moong dal cheela with mint chutney", emoji: "🥞", kcal: 180, protein: 9 },
      { name: "Warm oats with banana & cinnamon", emoji: "🥣", kcal: 220, protein: 6 },
      { name: "Poha with peanuts & lemon", emoji: "🍚", kcal: 250, protein: 6 },
      { name: "Ragi porridge with jaggery", emoji: "🥣", kcal: 200, protein: 5 },
      { name: "Vegetable daliya", emoji: "🌾", kcal: 190, protein: 6 },
      { name: "Masala oats with vegetables", emoji: "🥣", kcal: 210, protein: 7 },
      { name: "Boiled eggs with whole wheat toast", emoji: "🍳", kcal: 260, protein: 14, egg: true },
      { name: "Curd with mixed fruit", emoji: "🍨", kcal: 150, protein: 7, dairy: true },
    ],
    lunch: [
      { name: "Palak dal with steamed rice", emoji: "🍲", kcal: 320, protein: 12 },
      { name: "Beetroot & chickpea salad bowl", emoji: "🥗", kcal: 280, protein: 10 },
      { name: "Rajma with brown rice", emoji: "🍛", kcal: 380, protein: 14 },
      { name: "Chana masala with jeera rice", emoji: "🍛", kcal: 360, protein: 12 },
      { name: "Mixed vegetable curry with roti", emoji: "🫓", kcal: 300, protein: 8 },
      { name: "Khichdi with ghee & curd", emoji: "🍚", kcal: 350, protein: 10, dairy: true },
      { name: "Grilled paneer with sautéed greens", emoji: "🧀", kcal: 310, protein: 18, dairy: true },
      { name: "Vegetable pulao with raita", emoji: "🍚", kcal: 330, protein: 8, dairy: true },
    ],
    dinner: [
      { name: "Vegetable soup with whole grain toast", emoji: "🍜", kcal: 220, protein: 7 },
      { name: "Light dal khichdi", emoji: "🍚", kcal: 280, protein: 11 },
      { name: "Pan-seared tofu with stir-fried veggies", emoji: "🥡", kcal: 260, protein: 16 },
      { name: "Warm vegetable stew", emoji: "🍲", kcal: 210, protein: 6 },
      { name: "Moong sprouts salad", emoji: "🌱", kcal: 180, protein: 10 },
      { name: "Grilled fish with sautéed veggies", emoji: "🐟", kcal: 290, protein: 28, nonveg: true },
      { name: "Curd rice with pomegranate", emoji: "🍚", kcal: 260, protein: 8, dairy: true },
      { name: "Vegetable khichdi with a dollop of ghee", emoji: "🍚", kcal: 300, protein: 9, dairy: true },
    ],
    avoid: [{ name: "Excess caffeine", emoji: "☕" }, { name: "Salty snacks", emoji: "🥨" }, { name: "Alcohol", emoji: "🍷" }],
    yoga: [
      { name: "Child's Pose", emoji: "🧘‍♀️", benefit: "Releases lower back & pelvic tension", duration: "1-2 min", howTo: "Kneel, sit back on your heels, fold forward with arms extended, breathe slowly." },
      { name: "Reclined Butterfly", emoji: "🦋", benefit: "Eases cramping, opens hips", duration: "3-5 min", howTo: "Lie back, soles of feet together, knees relaxed outward, support with cushions." },
      { name: "Cat-Cow", emoji: "🐈", benefit: "Gentle spinal movement for cramp relief", duration: "8-10 rounds", howTo: "On all fours, inhale and arch your back, exhale and round your spine, moving slowly." },
      { name: "Supine Twist", emoji: "🌀", benefit: "Releases lower-back tension and eases bloating", duration: "1 min/side", howTo: "Lie down, drop both knees to one side, arms out wide, gaze the opposite way." },
    ],
    move: "Energy is lowest now — gentle walking or restorative stretching beats a hard workout.",
    selfCare: {
      physical: ["A hot water bottle on the lower belly eases cramping fast.", "A warm shower or gentle stretching loosens tight muscles."],
      emotional: ["It's okay to say no to plans this week — low energy isn't a character flaw.", "Mood dips are hormonal, not a verdict on how things are actually going."],
      sleep: ["Extra sleep this week isn't lazy — it's your body doing real repair work.", "A warm drink and dim lights an hour before bed help with cramp-related restlessness."],
    },
  },
  follicular: {
    dailySteps: "8,000–10,000 steps (energy is climbing — good week to move more)",
    breakfast: [
      { name: "Vegetable upma with peanuts", emoji: "🍲", kcal: 230, protein: 7 },
      { name: "Sprouted moong salad", emoji: "🌱", kcal: 180, protein: 10 },
      { name: "Besan chilla with tomato chutney", emoji: "🥞", kcal: 200, protein: 9 },
      { name: "Vegetable daliya", emoji: "🌾", kcal: 190, protein: 6 },
      { name: "Oats idli with sambar", emoji: "🍘", kcal: 210, protein: 8 },
      { name: "Stuffed vegetable paratha", emoji: "🫓", kcal: 260, protein: 7 },
      { name: "Egg bhurji with multigrain roti", emoji: "🍳", kcal: 280, protein: 16, egg: true },
      { name: "Greek yogurt with berries & granola", emoji: "🥣", kcal: 230, protein: 14, dairy: true },
    ],
    lunch: [
      { name: "Quinoa & roasted vegetable bowl", emoji: "🍚", kcal: 340, protein: 12 },
      { name: "Rajma chawal", emoji: "🍛", kcal: 380, protein: 14 },
      { name: "Stir-fried tofu with brown rice", emoji: "🍜", kcal: 320, protein: 17 },
      { name: "Chana salad with lemon dressing", emoji: "🥗", kcal: 260, protein: 11 },
      { name: "Sprouts & vegetable stir-fry", emoji: "🌱", kcal: 220, protein: 11 },
      { name: "Mixed dal with jeera rice", emoji: "🍚", kcal: 330, protein: 12 },
      { name: "Grilled chicken salad bowl", emoji: "🍗", kcal: 320, protein: 34, nonveg: true },
      { name: "Paneer tikka bowl", emoji: "🧀", kcal: 340, protein: 19, dairy: true },
    ],
    dinner: [
      { name: "Vegetable stir-fry with quinoa", emoji: "🍚", kcal: 300, protein: 10 },
      { name: "Moong dal with roti", emoji: "🫓", kcal: 290, protein: 11 },
      { name: "Baked sweet potato with chickpeas", emoji: "🍠", kcal: 310, protein: 11 },
      { name: "Light vegetable pulao", emoji: "🍛", kcal: 280, protein: 7 },
      { name: "Tofu & vegetable stir-fry", emoji: "🥡", kcal: 270, protein: 16 },
      { name: "Vegetable khichdi", emoji: "🍚", kcal: 280, protein: 9 },
      { name: "Grilled fish with broccoli", emoji: "🥦", kcal: 300, protein: 29, nonveg: true },
      { name: "Pan-seared paneer with broccoli", emoji: "🧀", kcal: 310, protein: 18, dairy: true },
    ],
    avoid: [{ name: "Heavily processed snacks", emoji: "🍟" }],
    yoga: [
      { name: "Sun Salutations", emoji: "☀️", benefit: "Builds heat as energy climbs", duration: "5-8 rounds", howTo: "Flow through the classic sequence at a steady, energizing pace." },
      { name: "Warrior II", emoji: "⚔️", benefit: "Builds strength for the energy climb", duration: "30-45 sec/side", howTo: "Wide stance, front knee bent, arms extended, gaze over your front hand." },
      { name: "Bridge Pose", emoji: "🌉", benefit: "Activates core and glutes", duration: "5 breaths x3", howTo: "Lie on your back, feet hip-width apart, lift hips, clasp hands beneath you." },
      { name: "Boat Pose", emoji: "🚣", benefit: "Builds core strength while energy is high", duration: "20-30 sec x3", howTo: "Balance on your sit bones, lift legs and chest into a V-shape." },
    ],
    move: "Energy and motivation typically peak here — a great window to try something new or lift heavier.",
    selfCare: {
      physical: ["Energy is climbing — ease back into movement you enjoy.", "Skin often looks its best now — good timing for a skincare routine."],
      emotional: ["Focus tends to be sharper — a good week to plan or start something new.", "Use the motivation boost, but don't overbook every evening."],
      sleep: ["Sleep needs often dip a little this week, but don't skip it entirely.", "A consistent wake time helps lock in the energy lift."],
    },
  },
  ovulation: {
    dailySteps: "9,000–11,000 steps (energy peak — a good week for your most active plans)",
    breakfast: [
      { name: "Smoothie bowl with berries & flax seeds", emoji: "🍓", kcal: 240, protein: 6 },
      { name: "Vegetable poha with peanuts", emoji: "🍚", kcal: 250, protein: 6 },
      { name: "Overnight oats with chia seeds", emoji: "🥣", kcal: 260, protein: 8 },
      { name: "Sprouted salad bowl", emoji: "🌱", kcal: 190, protein: 9 },
      { name: "Vegetable sandwich", emoji: "🥪", kcal: 230, protein: 7 },
      { name: "Ragi dosa with chutney", emoji: "🥞", kcal: 200, protein: 6 },
      { name: "Avocado toast with a boiled egg", emoji: "🥑", kcal: 290, protein: 12, egg: true },
      { name: "Fruit & nut yogurt parfait", emoji: "🍨", kcal: 240, protein: 10, dairy: true },
    ],
    lunch: [
      { name: "Quinoa salad with berries & greens", emoji: "🥗", kcal: 300, protein: 9 },
      { name: "Chickpea & cucumber salad", emoji: "🥒", kcal: 260, protein: 10 },
      { name: "Stir-fried vegetables with brown rice", emoji: "🍚", kcal: 300, protein: 8 },
      { name: "Lentil soup with a side salad", emoji: "🍲", kcal: 260, protein: 13 },
      { name: "Rajma salad bowl", emoji: "🥗", kcal: 290, protein: 12 },
      { name: "Tofu buddha bowl", emoji: "🥡", kcal: 310, protein: 16 },
      { name: "Grilled chicken with veggies", emoji: "🍗", kcal: 320, protein: 33, nonveg: true },
      { name: "Paneer & spinach bowl", emoji: "🧀", kcal: 330, protein: 19, dairy: true },
    ],
    dinner: [
      { name: "Light vegetable curry with rice", emoji: "🍛", kcal: 300, protein: 8 },
      { name: "Vegetable khichdi", emoji: "🍚", kcal: 280, protein: 9 },
      { name: "Stuffed bell peppers", emoji: "🫑", kcal: 260, protein: 9 },
      { name: "Tofu stir-fry with greens", emoji: "🥡", kcal: 270, protein: 16 },
      { name: "Lentil & vegetable curry", emoji: "🍲", kcal: 290, protein: 12 },
      { name: "Moong dal soup with veggies", emoji: "🍲", kcal: 220, protein: 11 },
      { name: "Grilled fish with steamed greens", emoji: "🐟", kcal: 290, protein: 28, nonveg: true },
      { name: "Paneer tikka with salad", emoji: "🧀", kcal: 310, protein: 18, dairy: true },
    ],
    avoid: [{ name: "Excess salt (mild bloating)", emoji: "🧂" }],
    yoga: [
      { name: "Warrior III", emoji: "🦅", benefit: "Uses peak strength & balance", duration: "20-30 sec/side", howTo: "Hinge forward on one leg, extend the other leg back, arms forward." },
      { name: "Wheel Pose", emoji: "🎡", benefit: "Energizing backbend for high-energy days", duration: "15-20 sec x2", howTo: "Lie back, hands by your ears, press up into a backbend gently." },
      { name: "Triangle Pose", emoji: "📐", benefit: "Full-body stretch and stamina", duration: "30 sec/side", howTo: "Wide stance, hinge at the hip, one hand down, one hand reaching up." },
      { name: "Camel Pose", emoji: "🐪", benefit: "Opens the chest, boosts energy circulation", duration: "20-30 sec", howTo: "Kneel, hands to heels, lift your chest and open the front body." },
    ],
    move: "Peak strength and stamina for most people — high-intensity workouts tend to feel best now.",
    selfCare: {
      physical: ["Stay a touch more hydrated — fluid needs tick up slightly.", "Mild ovulation twinges or bloating are normal — a heating pad helps."],
      emotional: ["Confidence and sociability often peak here — good week for important conversations.", "Libido often rises around now, worth knowing if that's relevant to you."],
      sleep: ["Twinges can disturb sleep for a night or two — a heating pad before bed helps.", "Body temperature rises slightly around ovulation — keep the room cool."],
    },
  },
  luteal: {
    dailySteps: "6,000–8,000 steps (taper gradually as your period approaches)",
    breakfast: [
      { name: "Oats with banana & walnuts", emoji: "🥣", kcal: 260, protein: 7 },
      { name: "Chia pudding with berries", emoji: "🍓", kcal: 220, protein: 6 },
      { name: "Multigrain toast with peanut butter", emoji: "🍞", kcal: 270, protein: 9 },
      { name: "Moong dal cheela with chutney", emoji: "🥞", kcal: 180, protein: 9 },
      { name: "Besan chilla with veggies", emoji: "🥞", kcal: 200, protein: 9 },
      { name: "Vegetable daliya", emoji: "🌾", kcal: 190, protein: 6 },
      { name: "Banana & nut smoothie", emoji: "🍌", kcal: 230, protein: 6 },
      { name: "Vegetable paratha with curd", emoji: "🫓", kcal: 280, protein: 8, dairy: true },
    ],
    lunch: [
      { name: "Sweet potato & chickpea bowl", emoji: "🍠", kcal: 320, protein: 11 },
      { name: "Brown rice with dal & sautéed spinach", emoji: "🍚", kcal: 340, protein: 12 },
      { name: "Quinoa bowl with roasted pumpkin", emoji: "🎃", kcal: 310, protein: 9 },
      { name: "Tofu & roasted vegetable bowl", emoji: "🥡", kcal: 300, protein: 16 },
      { name: "Rajma with brown rice", emoji: "🍛", kcal: 380, protein: 14 },
      { name: "Mixed vegetable curry with roti", emoji: "🫓", kcal: 300, protein: 8 },
      { name: "Grilled chicken with roasted veggies", emoji: "🍗", kcal: 320, protein: 33, nonveg: true },
      { name: "Vegetable khichdi with ghee", emoji: "🍚", kcal: 310, protein: 9, dairy: true },
    ],
    dinner: [
      { name: "Warm vegetable soup with toast", emoji: "🍜", kcal: 220, protein: 7 },
      { name: "Baked sweet potato with black beans", emoji: "🍠", kcal: 300, protein: 11 },
      { name: "Vegetable stew with brown rice", emoji: "🍲", kcal: 290, protein: 8 },
      { name: "Lentil soup with greens", emoji: "🍲", kcal: 250, protein: 12 },
      { name: "Tofu & vegetable curry", emoji: "🥡", kcal: 280, protein: 16 },
      { name: "Moong khichdi", emoji: "🍚", kcal: 270, protein: 10 },
      { name: "Khichdi with curd", emoji: "🍚", kcal: 300, protein: 10, dairy: true },
      { name: "Light paneer curry with roti", emoji: "🧀", kcal: 320, protein: 17, dairy: true },
    ],
    avoid: [{ name: "Sugar spikes", emoji: "🍬" }, { name: "Excess caffeine (worsens tenderness)", emoji: "☕" }],
    yoga: [
      { name: "Legs-Up-The-Wall", emoji: "🧘", benefit: "Calms nervous system, reduces bloating", duration: "5-10 min", howTo: "Lie near a wall, extend legs up it, arms relaxed by your sides." },
      { name: "Seated Forward Fold", emoji: "🙇‍♀️", benefit: "Soothing, introspective stretch", duration: "1-2 min", howTo: "Sit with legs extended, hinge forward from the hips, relax your neck." },
      { name: "Gentle Twist", emoji: "🌀", benefit: "Aids digestion as bloating rises", duration: "1 min/side", howTo: "Seated, twist your torso toward one side, hand on the floor behind you." },
      { name: "Child's Pose", emoji: "🧘‍♀️", benefit: "Grounding and calming before your period arrives", duration: "2-3 min", howTo: "Kneel and fold forward, resting your forehead on the mat, breathe deeply." },
    ],
    move: "Energy tapers through this phase — shift from moderate cardio to gentler movement as your period nears.",
    selfCare: {
      physical: ["PMS symptoms cluster in the back half of this phase — rest beats pushing through.", "Less caffeine and more water can noticeably ease bloating."],
      emotional: ["Irritability here is hormonal — journaling or naming it can take the sting out.", "This is a natural wind-down phase — lighter social plans are okay."],
      sleep: ["Progesterone can disrupt sleep quality — a wind-down routine helps more than usual.", "Sensitivity to caffeine often rises in this phase, so cut it off earlier."],
    },
  },
};

// ---------------------------------------------------------------------------
// Diet-specific dishes. FALLBACK_DATA holds the plant-based and a few dairy/egg
// dishes; DIET_EXTRA adds dairy-based, egg-based and non-vegetarian dishes for every
// phase and meal. dishesForDiet() then builds a DIFFERENT menu for each diet:
//   Vegan = plant-only · Vegetarian = dairy-led · Eggetarian = egg-led ·
//   Non-vegetarian = chicken/fish/mutton-led · No preference = a mix of all.
// Kcal/protein are approximate per-serving estimates.
// ---------------------------------------------------------------------------
const dish = (name, emoji, kcal, protein, tag) => ({
  name, emoji, kcal, protein,
  ...(tag === "dairy" ? { dairy: true } : tag === "egg" ? { egg: true } : tag === "fish" ? { nonveg: true, fish: true } : { nonveg: true }),
});
const DIET_EXTRA = {
  menstrual: {
    breakfast: [
      dish("Paneer bhurji with whole wheat toast", "🧀", 280, 16, "dairy"), dish("Warm milk oats with dates & almonds", "🥛", 300, 11, "dairy"), dish("Poha with curd & pomegranate", "🍚", 250, 8, "dairy"),
      dish("Spinach omelette with multigrain toast", "🍳", 270, 16, "egg"), dish("Masala egg bhurji with roti", "🍳", 290, 15, "egg"), dish("Boiled eggs with beetroot salad", "🥚", 220, 14, "egg"),
      dish("Chicken keema toast with spinach", "🍞", 310, 21, "meat"), dish("Chicken & vegetable sandwich", "🥪", 330, 24, "meat"), dish("Chicken sausage scramble with toast", "🍳", 340, 22, "meat"),
    ],
    lunch: [
      dish("Palak paneer with roti", "🧀", 340, 17, "dairy"), dish("Paneer bhurji with jeera rice", "🍛", 360, 18, "dairy"), dish("Dahi kadhi with rice", "🍚", 320, 9, "dairy"),
      dish("Egg curry with brown rice", "🥚", 380, 19, "egg"), dish("Egg fried rice with vegetables", "🍳", 360, 14, "egg"), dish("Masala omelette roti wrap", "🌯", 330, 16, "egg"),
      dish("Chicken curry with brown rice", "🍗", 420, 32, "meat"), dish("Mutton keema with spinach and roti", "🥩", 430, 30, "meat"), dish("Grilled chicken with sautéed spinach", "🍗", 330, 35, "meat"), dish("Fish curry with steamed rice", "🐟", 380, 27, "fish"),
    ],
    dinner: [
      dish("Light palak paneer with roti", "🧀", 330, 17, "dairy"), dish("Curd rice with roasted beetroot", "🍚", 270, 9, "dairy"), dish("Moong khichdi with curd", "🍚", 300, 12, "dairy"),
      dish("Egg bhurji with roti and salad", "🍳", 300, 16, "egg"), dish("Egg drop vegetable soup", "🥣", 180, 11, "egg"), dish("Light egg curry with roti", "🥚", 320, 17, "egg"),
      dish("Chicken soup with vegetables", "🍲", 220, 24, "meat"), dish("Light chicken stew with veggies", "🍲", 280, 27, "meat"), dish("Fish curry with a small portion of rice", "🐟", 350, 27, "fish"), dish("Mutton soup with vegetables", "🍲", 240, 22, "meat"),
    ],
  },
  follicular: {
    breakfast: [
      dish("Greek yogurt with sprouts & seeds", "🥣", 230, 16, "dairy"), dish("Paneer sandwich with veggies", "🥪", 310, 17, "dairy"), dish("Paneer-stuffed besan chilla", "🥞", 280, 16, "dairy"),
      dish("Veggie omelette with multigrain toast", "🍳", 290, 17, "egg"), dish("Egg & avocado toast", "🥑", 310, 14, "egg"), dish("Boiled eggs with sprouts salad", "🥚", 250, 17, "egg"),
      dish("Chicken tikka sandwich", "🥪", 340, 26, "meat"), dish("Chicken & veggie wrap", "🌯", 350, 25, "meat"), dish("Chicken salad toast", "🍞", 300, 23, "meat"),
    ],
    lunch: [
      dish("Paneer & quinoa bowl", "🧀", 360, 19, "dairy"), dish("Curd rice with cucumber & carrot", "🍚", 280, 9, "dairy"), dish("Paneer stir-fry with brown rice", "🍛", 380, 20, "dairy"),
      dish("Egg salad bowl with quinoa", "🥗", 330, 18, "egg"), dish("Egg fried rice with sprouts", "🍚", 350, 15, "egg"), dish("Egg & veggie wrap", "🌯", 340, 17, "egg"),
      dish("Grilled chicken with quinoa", "🍗", 380, 38, "meat"), dish("Chicken stir-fry with brown rice", "🍗", 400, 33, "meat"), dish("Lemon-herb fish with veggies", "🐟", 330, 30, "fish"), dish("Chicken tikka salad", "🍗", 300, 32, "meat"),
    ],
    dinner: [
      dish("Paneer bhurji with roti", "🧀", 330, 18, "dairy"), dish("Curd & vegetable pulao", "🍛", 300, 9, "dairy"), dish("Paneer & capsicum stir-fry", "🫑", 290, 17, "dairy"),
      dish("Veg omelette with sautéed greens", "🍳", 280, 16, "egg"), dish("Egg curry with roti", "🥚", 350, 17, "egg"), dish("Egg bhurji with quinoa", "🍳", 320, 17, "egg"),
      dish("Grilled chicken with sautéed broccoli", "🍗", 330, 36, "meat"), dish("Fish tikka with salad", "🐟", 290, 29, "fish"), dish("Chicken soup with greens", "🍲", 240, 26, "meat"), dish("Baked fish with lemon & veggies", "🐟", 310, 30, "fish"),
    ],
  },
  ovulation: {
    breakfast: [
      dish("Berry yogurt bowl with nuts", "🍓", 260, 12, "dairy"), dish("Paneer & cucumber sandwich", "🥪", 280, 15, "dairy"), dish("Fruit & curd bowl with chia", "🍨", 240, 10, "dairy"),
      dish("Egg-white veggie omelette", "🍳", 220, 18, "egg"), dish("Egg & spinach wrap", "🌯", 300, 16, "egg"), dish("Boiled egg & berry plate with toast", "🥚", 280, 14, "egg"),
      dish("Chicken & avocado toast", "🥑", 340, 25, "meat"), dish("Chicken salad wrap", "🌯", 340, 26, "meat"), dish("Smoked chicken sandwich", "🥪", 320, 24, "meat"),
    ],
    lunch: [
      dish("Paneer & cucumber salad bowl", "🥗", 300, 17, "dairy"), dish("Paneer tikka with mint salad", "🧀", 310, 19, "dairy"), dish("Cottage cheese & quinoa salad", "🥗", 330, 18, "dairy"),
      dish("Egg & quinoa salad", "🥗", 320, 17, "egg"), dish("Egg & cucumber sandwich", "🥪", 300, 14, "egg"), dish("Egg fried rice with greens", "🍳", 350, 15, "egg"),
      dish("Lemon chicken with quinoa", "🍗", 370, 36, "meat"), dish("Grilled prawns with greens", "🍤", 280, 28, "fish"), dish("Fish & cucumber salad bowl", "🐟", 300, 27, "fish"), dish("Chicken lettuce wraps", "🥬", 300, 30, "meat"),
    ],
    dinner: [
      dish("Paneer & vegetable skewers", "🍢", 300, 18, "dairy"), dish("Khichdi with cucumber raita", "🍚", 300, 10, "dairy"), dish("Cottage cheese stuffed peppers", "🫑", 290, 17, "dairy"),
      dish("Egg & vegetable stir-fry", "🍳", 290, 16, "egg"), dish("Zucchini omelette with salad", "🍳", 260, 15, "egg"), dish("Egg drop veggie soup", "🍲", 200, 12, "egg"),
      dish("Grilled chicken with steamed greens", "🍗", 310, 35, "meat"), dish("Prawn stir-fry with vegetables", "🍤", 280, 26, "fish"), dish("Fish tikka with mint salad", "🐟", 290, 29, "fish"), dish("Chicken & vegetable skewers", "🍢", 320, 32, "meat"),
    ],
  },
  luteal: {
    breakfast: [
      dish("Warm milk oats with banana & walnuts", "🥛", 300, 11, "dairy"), dish("Paneer paratha with curd", "🫓", 340, 15, "dairy"), dish("Banana & oats yogurt smoothie", "🍌", 280, 10, "dairy"),
      dish("Egg & sweet potato hash", "🍠", 320, 14, "egg"), dish("Veggie omelette with multigrain toast", "🍳", 290, 16, "egg"), dish("Boiled eggs with peanut-butter toast", "🥚", 310, 17, "egg"),
      dish("Chicken & sweet potato hash", "🍠", 340, 24, "meat"), dish("Chicken keema toast", "🍞", 320, 22, "meat"), dish("Chicken sandwich with avocado", "🥪", 350, 24, "meat"),
    ],
    lunch: [
      dish("Paneer & sweet potato bowl", "🍠", 350, 18, "dairy"), dish("Dahi rice with roasted pumpkin", "🍚", 310, 9, "dairy"), dish("Paneer curry with brown rice", "🍛", 380, 19, "dairy"),
      dish("Egg & sweet potato bowl", "🍠", 350, 16, "egg"), dish("Egg masala with roti", "🥚", 340, 16, "egg"), dish("Egg fried brown rice", "🍳", 360, 15, "egg"),
      dish("Chicken & pumpkin stew", "🍗", 360, 30, "meat"), dish("Grilled chicken with roasted sweet potato", "🍗", 380, 34, "meat"), dish("Fish curry with brown rice", "🐟", 390, 27, "fish"), dish("Mutton curry with roti (small portion)", "🥩", 420, 28, "meat"),
    ],
    dinner: [
      dish("Paneer & spinach curry with roti", "🧀", 340, 18, "dairy"), dish("Dahi kadhi with brown rice", "🍚", 320, 9, "dairy"), dish("Light paneer tikka masala with roti", "🧀", 350, 19, "dairy"),
      dish("Egg curry with roti", "🥚", 340, 17, "egg"), dish("Egg & vegetable fried rice", "🍳", 350, 14, "egg"), dish("Egg drop soup with toast", "🍲", 240, 13, "egg"),
      dish("Chicken stew with vegetables", "🍲", 320, 30, "meat"), dish("Grilled fish with mashed sweet potato", "🐟", 340, 29, "fish"), dish("Chicken soup with whole grain toast", "🍲", 280, 26, "meat"), dish("Mutton soup with veggies", "🍲", 260, 22, "meat"),
    ],
  },
};

const DIET_GUIDE = {
  Vegetarian: "Every dish must be vegetarian: no meat, fish, poultry or egg. Dairy is allowed, so make at least 2 of the 5 options paneer, curd, milk or ghee based.",
  Eggetarian: "No meat, fish or poultry. Make at least 2 of the 5 options egg-based and keep the rest vegetarian.",
  Vegan: "Strictly plant-based: no meat, fish, egg, dairy, ghee or honey. Use plant proteins such as tofu, soya, lentils, chickpeas, beans, nuts and seeds.",
  "Non-vegetarian": "Make at least 3 of the 5 options chicken, fish, mutton or egg dishes, balanced with vegetables and whole grains.",
};
const DIET_NOTE = {
  "No preference": "A mix of vegetarian, egg and non-vegetarian dishes.",
  Vegetarian: "Dairy-led: paneer, curd and ghee dishes; no egg, meat or fish.",
  Eggetarian: "Egg-led: egg dishes with vegetarian options; no meat or fish.",
  Vegan: "Plant-only: no dairy, egg, meat, fish or honey.",
  "Non-vegetarian": "Chicken, fish, mutton and egg dishes, balanced with vegetables.",
};
const YOGA_CALM = { name: "Alternate-Nostril Breathing", emoji: "🌬️", benefit: "Calms the nervous system when stress is high", duration: "3-5 min", howTo: "Sit tall, close the right nostril and inhale left, then switch and exhale right; repeat slowly." };

// A different menu for each diet (see the comment above DIET_EXTRA).
function dishesForDiet(phaseKey, meal, diet) {
  const pool = [...FALLBACK_DATA[phaseKey][meal], ...DIET_EXTRA[phaseKey][meal]];
  const by = { plant: [], dairy: [], egg: [], nonveg: [] };
  pool.forEach((it) => by[it.nonveg ? "nonveg" : it.egg ? "egg" : it.dairy ? "dairy" : "plant"].push(it));
  switch (diet) {
    case "Vegan": return by.plant;
    case "Vegetarian": return [...by.dairy.slice(0, 4), ...by.plant.slice(0, 3)];
    case "Eggetarian": return [...by.egg.slice(0, 4), ...by.dairy.slice(0, 1), ...by.plant.slice(0, 2)];
    case "Non-vegetarian": return [...by.nonveg.slice(0, 5), ...by.egg.slice(0, 2), ...by.plant.slice(0, 1)];
    default: { // No preference: a mix of everything
      const mix = [];
      for (let i = 1; i < 8 && mix.length < 8; i++) [by.nonveg, by.dairy, by.egg, by.plant].forEach((g) => { if (g[i]) mix.push(g[i]); });
      return mix.slice(0, 8);
    }
  }
}
// Scales the phase's step range by activity level (rounded to 500).
function stepsForActivity(base, level) {
  const m = /([\d,]+)–([\d,]+)/.exec(base || "");
  if (!m) return base;
  const f = level === "Sedentary" ? 0.75 : level === "Very active" ? 1.25 : 1;
  const r = (n) => Math.round((parseInt(n.replace(/,/g, ""), 10) * f) / 500) * 500;
  return base.replace(m[0], `${r(m[1]).toLocaleString("en-US")}–${r(m[2]).toLocaleString("en-US")}`);
}
// Extra self-care tips that depend on what the user entered in the profile.
function personalCare(p) {
  const out = { physical: [], emotional: [], sleep: [] };
  if (p.sleepHours === "<5 hrs") out.sleep.push("You sleep under 5 hours — protect a fixed bedtime this week; short sleep can make cramps and mood swings feel worse.");
  else if (p.sleepHours === "5–7 hrs") out.sleep.push("Try to add 30–45 minutes of sleep this week with a fixed wind-down routine.");
  if (p.stressLevel === "High") out.emotional.push("Stress is high — try 5 minutes of slow breathing (inhale 4, exhale 6) twice a day.");
  else if (p.stressLevel === "Moderate") out.emotional.push("A short daily walk or a few lines of journaling can stop moderate stress from building up.");
  if (p.activityLevel === "Sedentary") out.physical.push("Start small: a 10-minute walk after meals counts and can ease cramps and bloating.");
  if (p.healthIssues && p.healthIssues.length) out.physical.push(`You noted ${p.healthIssues.join(", ")} — these tips are general, so check food and exercise changes with your doctor.`);
  return out;
}
// Built-in (offline) content for a phase, shaped by the saved profile.
function buildFallback(phaseKey, profile) {
  const base = FALLBACK_DATA[phaseKey];
  const care = personalCare(profile);
  let move = base.move;
  if (profile.activityLevel === "Sedentary") move += " You are mostly sedentary, so stay at the shorter end of each hold.";
  if (profile.activityLevel === "Very active") move += " You are very active, so you can add an extra round or hold poses at the longer end.";
  return {
    ...base,
    breakfast: dishesForDiet(phaseKey, "breakfast", profile.dietaryPreference),
    lunch: dishesForDiet(phaseKey, "lunch", profile.dietaryPreference),
    dinner: dishesForDiet(phaseKey, "dinner", profile.dietaryPreference),
    dailySteps: stepsForActivity(base.dailySteps, profile.activityLevel),
    move,
    yoga: profile.stressLevel === "High" ? [...base.yoga, YOGA_CALM] : base.yoga,
    selfCare: {
      physical: [...care.physical, ...base.selfCare.physical],
      emotional: [...care.emotional, ...base.selfCare.emotional],
      sleep: [...care.sleep, ...base.selfCare.sleep],
    },
  };
}

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const toISO = (d) => {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};
const parseISO = (s) => {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (a, b) => Math.round((parseISO(toISO(b)) - parseISO(toISO(a))) / 86400000);
const todayISO = () => toISO(new Date());
const addDays = (date, n) => {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
};
const fmtDate = (iso) => parseISO(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
const monthKey = (iso) => iso.slice(0, 7);
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
};
function timeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: "Good morning", emoji: "☀️" };
  if (h < 17) return { text: "Good afternoon", emoji: "🌤️" };
  if (h < 21) return { text: "Good evening", emoji: "🌆" };
  return { text: "Good night", emoji: "🌙" };
}

// Standard-formula nutrition estimate from the profile. Returns null if any
// required input (age/weight/height) is missing — the UI then prompts to
// complete the profile instead of guessing. Deliberately conservative:
// - Healthy weight is a RANGE (BMI 18.5–24.9), never a single "ideal number."
// - Calorie adjustment is capped at a gentle ±350/day, with a 1,400 kcal
//   floor, so this can't suggest anything close to an unsafe crash diet.
// This is general educational math (Mifflin-St Jeor), not personalized
// medical or nutrition advice — the UI says so next to the numbers.
function computeNutrition(profile) {
  const w = parseFloat(profile.weight), h = parseFloat(profile.height), a = parseFloat(profile.age);
  if (!w || !h || !a) return null;
  const bmr = 10 * w + 6.25 * h - 5 * a - 161;
  const activityMultiplier = profile.activityLevel === "Sedentary" ? 1.2 : profile.activityLevel === "Very active" ? 1.55 : 1.375;
  const tdee = bmr * activityMultiplier;
  const heightM = h / 100;
  const healthyLow = Math.round(18.5 * heightM * heightM);
  const healthyHigh = Math.round(24.9 * heightM * heightM);
  let targetCalories, goal;
  if (w > healthyHigh + 1) { targetCalories = Math.max(Math.round((tdee - 350) / 10) * 10, 1400); goal = "a gentle calorie deficit"; }
  else if (w < healthyLow - 1) { targetCalories = Math.round((tdee + 300) / 10) * 10; goal = "a gentle calorie surplus"; }
  else { targetCalories = Math.round(tdee / 10) * 10; goal = "maintenance"; }
  const proteinPerKg = profile.activityLevel === "Very active" ? 1.3 : profile.activityLevel === "Sedentary" ? 0.8 : 1.0;
  const targetProtein = Math.round(w * proteinPerKg);
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), healthyLow, healthyHigh, targetCalories, targetProtein, goal };
}


/* ---------------- Stats / prediction ---------------- */
function computeStats(logs) {
  const sorted = [...logs].sort((a, b) => (a.start < b.start ? -1 : 1));
  const lengths = [];
  for (let i = 1; i < sorted.length; i++) lengths.push(daysBetween(sorted[i - 1].start, sorted[i].start));

  const periodLens = sorted.filter((l) => l.end).map((l) => daysBetween(l.start, l.end) + 1);
  const avgPeriodLength = periodLens.length ? Math.round(periodLens.reduce((a, b) => a + b, 0) / periodLens.length) : 5;

  let smoothedCycle = 28, confidence = "building", stdDev = 0, mean = 28;

  if (lengths.length >= 1) {
    mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    stdDev = Math.sqrt(lengths.reduce((s, l) => s + (l - mean) ** 2, 0) / lengths.length);
    const alpha = 0.4;
    smoothedCycle = lengths[0];
    for (let i = 1; i < lengths.length; i++) smoothedCycle = alpha * lengths[i] + (1 - alpha) * smoothedCycle;
    smoothedCycle = clamp(Math.round(smoothedCycle), 18, 45);
    confidence = lengths.length >= 4 ? "high" : lengths.length >= 2 ? "moderate" : "building";
  }

  const lastStartDate = sorted.length ? parseISO(sorted[sorted.length - 1].start) : null;
  const cycleDay = lastStartDate ? clamp(daysBetween(lastStartDate, new Date()) + 1, 1, 400) : null;

  const ovulationDay = smoothedCycle - 14;
  const fertileStart = clamp(ovulationDay - 5, 1, smoothedCycle);
  const fertileEnd = clamp(ovulationDay + 1, 1, smoothedCycle);

  let phase = null, overdueDays = 0;
  if (cycleDay !== null) {
    if (cycleDay <= avgPeriodLength) phase = "menstrual";
    else if (cycleDay < fertileStart) phase = "follicular";
    else if (cycleDay <= fertileEnd) phase = "ovulation";
    else if (cycleDay <= smoothedCycle) phase = "luteal";
    else { phase = "menstrual"; overdueDays = cycleDay - smoothedCycle; }
  }

  const nextPredictedStart = lastStartDate ? toISO(addDays(lastStartDate, smoothedCycle)) : null;

  return {
    lengths, avgPeriodLength, smoothedCycle, stdDev: Math.round(stdDev * 10) / 10, confidence,
    cycleDay, phase, overdueDays, ovulationDay, fertileStart, fertileEnd, nextPredictedStart,
    lastStart: lastStartDate ? toISO(lastStartDate) : null, cycleCount: sorted.length,
  };
}

function getForecast(stats, count = 4) {
  if (!stats.lastStart) return [];
  const out = [];
  let cursor = parseISO(stats.lastStart);
  for (let i = 1; i <= count; i++) {
    cursor = addDays(cursor, stats.smoothedCycle);
    const ovulation = addDays(cursor, -14);
    out.push({
      cycleNum: i,
      periodStart: toISO(cursor),
      ovulation: toISO(ovulation),
      fertileStart: toISO(addDays(ovulation, -5)),
      fertileEnd: toISO(addDays(ovulation, 1)),
      uncertainty: Math.round(stats.stdDev * Math.sqrt(i) * 10) / 10,
    });
  }
  return out;
}

// Shared by the wheel's static dot position AND the spin animation target —
// one function for both fixes the glitch where an overdue cycle sent the
// spin to the wrong angle relative to the dot's actual (clamped) position.
function markerAngleFor(cycleDay, cycleLen) {
  const day = clamp(cycleDay, 1, cycleLen);
  return (day / cycleLen) * 360 - 90;
}

/* ---------------- Local storage shim ----------------
   The original artifact version used window.storage, which only exists
   inside that sandbox. This mirrors its {get,set} shape using the
   browser's real localStorage, so data persists on this device only. */
const storage = {
  async get(key) {
    const v = localStorage.getItem(key);
    return v === null ? null : { key, value: v };
  },
  async set(key, value) {
    localStorage.setItem(key, value);
    return { key, value };
  },
};

function classifyDay(dayInCycle, cycleLen, periodLen) {
  const ovulationDay = cycleLen - 14;
  const fertileStart = clamp(ovulationDay - 5, 1, cycleLen);
  const fertileEnd = clamp(ovulationDay + 1, 1, cycleLen);
  if (dayInCycle <= periodLen) return "menstrual";
  if (dayInCycle < fertileStart) return "follicular";
  if (dayInCycle <= fertileEnd) return "ovulation";
  return "luteal";
}

// Phase for ANY calendar date, not just today. For a date between two
// logged periods we know the real cycle length, so predicted=false and the
// color is ground truth. For a date in the current (not-yet-closed) cycle —
// past or future — we only have the smoothed model, so predicted=true and
// the calendar shows that visually (dashed/faded) rather than presenting a
// guess as fact. Dates before the first logged period return null.
function phaseForDate(targetISO, sortedLogsAsc, stats) {
  if (!sortedLogsAsc.length) return null;
  const target = parseISO(targetISO);
  if (target < parseISO(sortedLogsAsc[0].start)) return null;

  let idx = -1;
  for (let i = 0; i < sortedLogsAsc.length; i++) {
    if (parseISO(sortedLogsAsc[i].start) <= target) idx = i; else break;
  }
  const anchor = parseISO(sortedLogsAsc[idx].start);

  if (idx + 1 < sortedLogsAsc.length) {
    const nextAnchor = parseISO(sortedLogsAsc[idx + 1].start);
    const cycleLen = daysBetween(anchor, nextAnchor);
    const dayInCycle = daysBetween(anchor, target) + 1;
    return { phase: classifyDay(dayInCycle, cycleLen, stats.avgPeriodLength), predicted: false };
  }

  const cycleLen = stats.smoothedCycle;
  const daysSince = daysBetween(anchor, target);
  const dayInCycle = (((daysSince % cycleLen) + cycleLen) % cycleLen) + 1;
  return { phase: classifyDay(dayInCycle, cycleLen, stats.avgPeriodLength), predicted: true };
}

/* ---------------- Mascot ---------------- */
function Mascot({ size = 96, wave = true }) {
  const petalAngles = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120">
      <style>{`
        @keyframes bloomBlink { 0%, 92%, 100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
        @keyframes bloomWave { 0%, 100% { transform: rotate(0deg); } 50% { transform: rotate(-22deg); } }
        @keyframes bloomFloat { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
        .bloom-eye { transform-origin: center; animation: bloomBlink 3.2s infinite; }
        .bloom-arm { transform-origin: 82px 68px; animation: bloomWave 1.6s ease-in-out infinite; }
        .bloom-mascot { transform-origin: center; animation: bloomFloat 3s ease-in-out infinite; }
      `}</style>
      <g className="bloom-mascot">
        {petalAngles.map((a) => (
          <ellipse key={a} cx="60" cy="34" rx="15" ry="22" fill="#FF6B9D" transform={`rotate(${a} 60 60)`} opacity="0.92" />
        ))}
        {wave && (
          <g className="bloom-arm">
            <line x1="82" y1="68" x2="102" y2="46" stroke="#FF9770" strokeWidth="7" strokeLinecap="round" />
          </g>
        )}
        <line x1="38" y1="68" x2="18" y2="80" stroke="#FF9770" strokeWidth="7" strokeLinecap="round" />
        <circle cx="60" cy="60" r="30" fill="#FFF9F5" />
        <circle cx="60" cy="60" r="30" fill="none" stroke="#FFD9E4" strokeWidth="2" />
        <ellipse className="bloom-eye" cx="50" cy="58" rx="3.5" ry="5" fill="#3D1F3D" />
        <ellipse className="bloom-eye" cx="70" cy="58" rx="3.5" ry="5" fill="#3D1F3D" />
        <ellipse cx="46" cy="68" rx="5" ry="3" fill="#FF9770" opacity="0.55" />
        <ellipse cx="74" cy="68" rx="5" ry="3" fill="#FF9770" opacity="0.55" />
        <path d="M 52 70 Q 60 78 68 70" stroke="#3D1F3D" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/* ---------------- Wheel ---------------- */
function BloomWheel({ stats, rotation, spinning }) {
  const size = 220, cx = size / 2, cy = size / 2, r = 88;
  const cycleLen = stats.smoothedCycle || 28;

  const segments = [
    { key: "menstrual", from: 0, to: stats.avgPeriodLength },
    { key: "follicular", from: stats.avgPeriodLength, to: stats.fertileStart },
    { key: "ovulation", from: stats.fertileStart, to: stats.fertileEnd },
    { key: "luteal", from: stats.fertileEnd, to: cycleLen },
  ].filter((s) => s.to > s.from);

  const angleFor = (day) => (day / cycleLen) * 360 - 90;
  const point = (day, radius) => {
    const a = (angleFor(day) * Math.PI) / 180;
    return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)];
  };
  const arcPath = (from, to, radius) => {
    const [x1, y1] = point(from, radius);
    const [x2, y2] = point(to, radius);
    const large = to - from > cycleLen / 2 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`;
  };

  const markerDay = stats.cycleDay ? clamp(stats.cycleDay, 1, cycleLen) : 1;
  const [mx, my] = point(markerDay, r);

  return (
    <div style={{ position: "relative", width: size, height: size, margin: "0 auto" }}>
      <div style={{ position: "absolute", top: -6, left: "50%", transform: "translateX(-50%)", zIndex: 2, fontSize: 22 }}>🔻</div>
      <div style={{ width: size, height: size, transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 2.4s cubic-bezier(0.16, 1, 0.3, 1)" : "none" }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {segments.map((s) => (
            <path key={s.key} d={arcPath(s.from, s.to, r)} fill={PHASES[s.key].color} opacity={0.88} stroke="#FFF9F5" strokeWidth="2" />
          ))}
          <circle cx={cx} cy={cy} r={44} fill="#FFF9F5" />
          {stats.cycleDay && <circle cx={mx} cy={my} r={7} fill="#3D1F3D" stroke="#FFF9F5" strokeWidth={2.5} />}
        </svg>
      </div>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
        <div style={{ fontFamily: "'Fredoka', sans-serif", fontSize: 26, fontWeight: 700, color: "#3D1F3D" }}>{stats.cycleDay ?? "–"}</div>
        <div style={{ fontSize: 11, color: "#7A5C7A" }}>cycle day</div>
      </div>
    </div>
  );
}

function Chip({ item, tone }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 999,
      fontSize: 12.5, fontWeight: 700, background: tone === "limit" ? "#FDEDEA" : "#EFFBF3",
      color: tone === "limit" ? "#C6522F" : "#2C9A5B", margin: "0 6px 6px 0",
    }}>
      <span>{item.emoji || "🍽️"}</span> {item.name}
    </span>
  );
}

function MealCard({ label, icon, items, index, onRefresh }) {
  const item = items && items.length ? items[index % items.length] : null;
  if (!item) return <div style={styles.mealCard}><div style={styles.mealLabel}>{icon} {label}</div><div style={styles.tipText}>No options match this diet yet.</div></div>;
  return (
    <div style={styles.mealCard}>
      <div style={styles.mealHeader}>
        <span style={styles.mealLabel}>{icon} {label}</span>
        <button style={styles.refreshBtn} onClick={onRefresh} title="Show another option">🔄</button>
      </div>
      <div style={styles.mealItem}><span style={{ fontSize: 20 }}>{item.emoji}</span> {item.name}</div>
      {(item.kcal || item.protein) && (
        <div style={styles.mealMacros}>
          {item.kcal ? <span>~{item.kcal} kcal</span> : null}
          {item.kcal && item.protein ? <span> · </span> : null}
          {item.protein ? <span>{item.protein}g protein</span> : null}
        </div>
      )}
      <div style={styles.mealDots}>
        {items.map((_, i) => <span key={i} style={{ ...styles.mealDot, background: i === index % items.length ? "#FF6B9D" : "#F0D8E0" }} />)}
      </div>
    </div>
  );
}

function ChipGroup({ options, value, onChange }) {
  return (
    <div style={{ marginBottom: 10 }}>
      {options.map((o) => (
        <button key={o} onClick={() => onChange(o)} style={{ ...styles.issueChip, ...(value === o ? styles.issueChipActive : {}) }}>{o}</button>
      ))}
    </div>
  );
}

function PhaseContextLine({ phase, stats }) {
  if (!phase) return null;
  return (
    <div style={styles.phaseContextLine}>
      {phase.emoji} {phase.name} phase · day {stats.cycleDay}{stats.overdueDays > 0 ? ` · ${stats.overdueDays}d late` : ""}
    </div>
  );
}

function MiniCalendar({ sortedLogsAsc, stats }) {
  const now = new Date();
  const [calMonth, setCalMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const monthStart = new Date(calMonth.y, calMonth.m, 1);
  const daysInMonth = new Date(calMonth.y, calMonth.m + 1, 0).getDate();
  const startWeekday = monthStart.getDay();
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const monthLabel = monthStart.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const todayStr = todayISO();

  const goPrev = () => setCalMonth((c) => (c.m === 0 ? { y: c.y - 1, m: 11 } : { y: c.y, m: c.m - 1 }));
  const goNext = () => setCalMonth((c) => (c.m === 11 ? { y: c.y + 1, m: 0 } : { y: c.y, m: c.m + 1 }));

  return (
    <div style={styles.card}>
      <div style={styles.calHeader}>
        <button style={styles.calNavBtn} onClick={goPrev} aria-label="Previous month">‹</button>
        <span style={styles.calMonthLabel}>{monthLabel}</span>
        <button style={styles.calNavBtn} onClick={goNext} aria-label="Next month">›</button>
      </div>
      <div style={styles.calWeekRow}>
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} style={styles.calWeekday}>{d}</span>)}
      </div>
      <div style={styles.calGrid}>
        {cells.map((d, i) => {
          if (d === null) return <div key={i} />;
          const iso = `${calMonth.y}-${String(calMonth.m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const result = phaseForDate(iso, sortedLogsAsc, stats);
          const isToday = iso === todayStr;
          const isLogStart = sortedLogsAsc.some((l) => l.start === iso);
          const phaseInfo = result ? PHASES[result.phase] : null;
          return (
            <div key={i} style={{
              ...styles.calCell,
              background: phaseInfo ? phaseInfo.soft : "#F7F2EF",
              opacity: result && result.predicted ? 0.6 : 1,
              border: isToday ? "2px solid #3D1F3D" : (result && result.predicted ? `1px dashed ${phaseInfo.color}` : "1px solid transparent"),
            }}>
              <span style={styles.calDayNum}>{d}</span>
              {isLogStart ? <span style={{ fontSize: 9 }}>🌸</span> : phaseInfo ? <span style={{ ...styles.calPhaseDot, background: phaseInfo.color }} /> : null}
            </div>
          );
        })}
      </div>
      <div style={styles.legendRow}>
        {Object.values(PHASES).map((p) => (
          <div key={p.name} style={styles.legendItem}><span style={{ ...styles.legendDot, background: p.color }} /> {p.name}</div>
        ))}
      </div>
      <div style={styles.caveatText}>Solid = from your logged history · dashed = predicted · 🌸 = logged start</div>
    </div>
  );
}

// Shared by the onboarding step and the regular 👤 profile modal, so the
// (fairly long) field list only has to exist in one place.
function ProfileFields({ draft, setDraft, onToggleHealth }) {
  return (
    <>
      <label style={styles.formLabel}>Name
        <input type="text" value={draft.name} placeholder="What should Bloom call you?" onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={styles.input} />
      </label>
      <label style={styles.formLabel}>Email (optional)
        <input type="email" value={draft.email || ""} placeholder="you@example.com" onChange={(e) => setDraft({ ...draft, email: e.target.value })} style={styles.input} />
      </label>
      <label style={styles.formLabel}>Phone (optional)
        <input type="tel" value={draft.phone || ""} placeholder="Phone number" onChange={(e) => setDraft({ ...draft, phone: e.target.value })} style={styles.input} />
      </label>
      <div style={{ display: "flex", gap: 10 }}>
        <label style={{ ...styles.formLabel, flex: 1 }}>Age
          <input type="number" min="0" value={draft.age} onChange={(e) => setDraft({ ...draft, age: e.target.value })} style={styles.input} />
        </label>
        <label style={{ ...styles.formLabel, flex: 1 }}>Weight (kg)
          <input type="number" min="0" value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} style={styles.input} />
        </label>
        <label style={{ ...styles.formLabel, flex: 1 }}>Height (cm)
          <input type="number" min="0" value={draft.height} onChange={(e) => setDraft({ ...draft, height: e.target.value })} style={styles.input} />
        </label>
      </div>
      <div style={styles.subLabel}>Any of these apply to you?</div>
      <div style={{ marginBottom: 10 }}>
        {HEALTH_OPTIONS.map((h) => (
          <button key={h} onClick={() => onToggleHealth(h)} style={{ ...styles.issueChip, ...(draft.healthIssues.includes(h) ? styles.issueChipActive : {}) }}>{h}</button>
        ))}
      </div>
      <div style={styles.subLabel}>Typical sleep</div>
      <ChipGroup options={SLEEP_OPTIONS} value={draft.sleepHours} onChange={(v) => setDraft({ ...draft, sleepHours: v })} />
      <div style={styles.subLabel}>Stress level lately</div>
      <ChipGroup options={STRESS_OPTIONS} value={draft.stressLevel} onChange={(v) => setDraft({ ...draft, stressLevel: v })} />
      <div style={styles.subLabel}>Activity level</div>
      <ChipGroup options={ACTIVITY_OPTIONS} value={draft.activityLevel} onChange={(v) => setDraft({ ...draft, activityLevel: v })} />
      <div style={styles.subLabel}>Dietary preference</div>
      <ChipGroup options={DIET_OPTIONS} value={draft.dietaryPreference} onChange={(v) => setDraft({ ...draft, dietaryPreference: v })} />
    </>
  );
}

const defaultProfile = { name: "", email: "", phone: "", age: "", weight: "", height: "", healthIssues: [], sleepHours: "", stressLevel: "", activityLevel: "", dietaryPreference: "" };

export default function App() {
  const [logs, setLogs] = useState([]);
  const [authUser, setAuthUser] = useState(null);
  const [cloudError, setCloudError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState("dashboard");
  const [form, setForm] = useState({ start: todayISO(), end: "" });
  const [error, setError] = useState("");

  const [showIntro, setShowIntro] = useState(true);
  const [onboardStep, setOnboardStep] = useState("greet"); // 'greet' | 'profile'
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const spinTimeout = useRef(null);

  const [mealIndex, setMealIndex] = useState({ breakfast: 0, lunch: 0, dinner: 0 });
  const [refreshTick, setRefreshTick] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);
  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2800);
  };

  const [profile, setProfile] = useState(defaultProfile);
  const [showProfile, setShowProfile] = useState(false);
  const [profileDraft, setProfileDraft] = useState(defaultProfile);


  const [checkins, setCheckins] = useState([]);
  const [checkinMood, setCheckinMood] = useState([]);
  const [checkinSymptoms, setCheckinSymptoms] = useState([]);
  const [checkinDigestive, setCheckinDigestive] = useState([]);
  const [checkinFactors, setCheckinFactors] = useState([]);
  const [checkinDate, setCheckinDate] = useState(todayISO());
  const [editingCheckin, setEditingCheckin] = useState(false);
  const [clearMonth, setClearMonth] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        const user = userResult?.user || null;
        if (!active) return;
        setAuthUser(user);
        if (!user) {
          setCloudError("Please sign in to load your private Bloom data.");
          setLoaded(true);
          return;
        }

        const [periodResult, profileResult, checkinResult] = await Promise.all([
          supabase.from("period_logs").select("id,start_date,end_date").eq("user_id", user.id).order("start_date", { ascending: false }),
          supabase.from("profiles").select("id,name,age,weight,height,health_issues,sleep_hours,stress_level,activity_level,dietary_preference").eq("id", user.id).maybeSingle(),
          supabase.from("daily_checkins").select("id,checkin_date,mood,symptoms,digestion,factors").eq("user_id", user.id).order("checkin_date", { ascending: false }),
        ]);
        if (periodResult.error) throw periodResult.error;
        if (profileResult.error) throw profileResult.error;
        if (checkinResult.error) throw checkinResult.error;
        if (!active) return;
        setLogs((periodResult.data || []).map(row => ({ id: row.id, start: row.start_date, end: row.end_date || null })));
        if (profileResult.data) {
          const row = profileResult.data;
          const p = { ...defaultProfile, name: row.name || "", email: user.email || "", age: row.age || "", weight: row.weight || "", height: row.height || "", healthIssues: row.health_issues || [], sleepHours: row.sleep_hours || "", stressLevel: row.stress_level || "", activityLevel: row.activity_level || "", dietaryPreference: row.dietary_preference || "" };
          setProfile(p); setProfileDraft(p);
        } else {
          setProfile(p => ({ ...p, email: user.email || "" }));
          setProfileDraft(p => ({ ...p, email: user.email || "" }));
        }
        setCheckins((checkinResult.data || []).map(row => ({ id: row.id, date: row.checkin_date, mood: row.mood || [], symptoms: row.symptoms || [], digestion: row.digestion || [], factors: row.factors || [] })));
        setCloudError("");
      } catch (e) {
        console.error("Bloom cloud load failed:", e);
        if (active) setCloudError(e.message || "Could not load your Bloom data from Supabase.");
      } finally { if (active) setLoaded(true); }
    })();
    return () => { active = false; clearTimeout(spinTimeout.current); };
    // Load once for the authenticated account.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persist = useCallback(async (next) => {
    if (!authUser) { setError("Please sign in before saving period dates."); return; }
    setLogs(next);
    try {
      const rows = next.map(l => ({ ...(typeof l.id === "string" ? { id: l.id } : {}), user_id: authUser.id, start_date: l.start, end_date: l.end || null }));
      const { data: savedRows, error: saveError } = await supabase.from("period_logs").upsert(rows, { onConflict: "id" }).select("id,start_date,end_date");
      if (saveError) throw saveError;
      if (savedRows) setLogs(savedRows.map(row => ({ id: row.id, start: row.start_date, end: row.end_date || null })));
      setCloudError("");
    } catch (e) { console.error(e); setError(`Could not save to your account: ${e.message}`); }
  }, [authUser]);

  const persistProfile = useCallback(async (p) => {
    if (!authUser) { setError("Please sign in before saving your profile."); return; }
    setProfile(p);
    try {
      const row = { id: authUser.id, name: p.name || null, age: p.age ? Number(p.age) : null, weight: p.weight ? Number(p.weight) : null, height: p.height ? Number(p.height) : null, health_issues: p.healthIssues || [], sleep_hours: p.sleepHours || null, stress_level: p.stressLevel || null, activity_level: p.activityLevel || null, dietary_preference: p.dietaryPreference || null, updated_at: new Date().toISOString() };
      const { error: saveError } = await supabase.from("profiles").upsert(row, { onConflict: "id" });
      if (saveError) throw saveError;
      setCloudError("");
    } catch (e) { console.error(e); setError(`Could not save profile: ${e.message}`); }
  }, [authUser]);

  const saveCheckin = async () => {
    if (!authUser) { setError("Please sign in before saving a check-in."); return; }
    const entry = { date: checkinDate, mood: checkinMood, symptoms: checkinSymptoms, digestion: checkinDigestive, factors: checkinFactors };
    try {
      const { data, error: saveError } = await supabase.from("daily_checkins").upsert({ user_id: authUser.id, checkin_date: entry.date, mood: entry.mood, symptoms: entry.symptoms, digestion: entry.digestion, factors: entry.factors, updated_at: new Date().toISOString() }, { onConflict: "user_id,checkin_date" }).select("id,checkin_date,mood,symptoms,digestion,factors").single();
      if (saveError) throw saveError;
      const saved = { id: data.id, date: data.checkin_date, mood: data.mood || [], symptoms: data.symptoms || [], digestion: data.digestion || [], factors: data.factors || [] };
      setCheckins(prev => [saved, ...prev.filter(x => x.date !== saved.date)].sort((a,b) => b.date.localeCompare(a.date)));
      setEditingCheckin(false); setCloudError(""); showToast("Daily check-in saved to your account 🌷");
    } catch (e) { console.error(e); setError(`Could not save check-in: ${e.message}`); }
  };
  const loadCheckin = (date) => {
    setCheckinDate(date);
    const found = checkins.find(x => x.date === date);
    setCheckinMood(found?.mood || []); setCheckinSymptoms(found?.symptoms || []);
    setCheckinDigestive(found?.digestion || []); setCheckinFactors(found?.factors || []);
    setEditingCheckin(true);
  };
  const deleteCheckin = async (date) => {
    if (!authUser) return;
    const { error: deleteError } = await supabase.from("daily_checkins").delete().eq("user_id", authUser.id).eq("checkin_date", date);
    if (deleteError) { setError(`Could not delete check-in: ${deleteError.message}`); return; }
    setCheckins(prev => prev.filter(x => x.date !== date)); showToast("Check-in deleted");
  };
  const toggleChoice = (setter, values, value) => setter(values.includes(value) ? values.filter(x => x !== value) : [...values, value]);

  const stats = useMemo(() => computeStats(logs), [logs, refreshTick]);
  const forecast = useMemo(() => getForecast(stats), [stats]);
  const nutrition = useMemo(() => computeNutrition(profile), [profile]);

  const bmi = useMemo(() => {
    const w = parseFloat(profile.weight), h = parseFloat(profile.height) / 100;
    if (!w || !h) return null;
    return Math.round((w / (h * h)) * 10) / 10;
  }, [profile]);

  const profileContext = () => {
    const parts = [];
    if (profile.weight && profile.height) parts.push(`height ${profile.height}cm, weight ${profile.weight}kg (BMI ${bmi})`);
    if (profile.healthIssues && profile.healthIssues.length) parts.push(`reported considerations: ${profile.healthIssues.join(", ")}`);
    if (profile.sleepHours) parts.push(`typical sleep: ${profile.sleepHours}`);
    if (profile.stressLevel) parts.push(`stress level: ${profile.stressLevel}`);
    if (profile.activityLevel) parts.push(`activity level: ${profile.activityLevel}`);
    if (profile.dietaryPreference && profile.dietaryPreference !== "No preference") parts.push(`dietary preference: ${profile.dietaryPreference}. ${DIET_GUIDE[profile.dietaryPreference] || ""} EVERY food item must comply, no exceptions, and still give 5 genuinely different options`);
    if (!parts.length) return "";
    return `User profile — ${parts.join("; ")}. Use this only to gently calibrate suggestions (gentler exercise if stressed/sedentary, extra sleep-focused self-care if sleep is short) — never mention BMI, weight, or diagnose anything directly in your reply.`;
  };


  // Keep the wheel's marker under the pointer whenever the data changes (new log, refresh, new day).
  useEffect(() => {
    if (revealed && stats.cycleDay) setRotation(4 * 360 + (-90 - markerAngleFor(stats.cycleDay, stats.smoothedCycle)));
  }, [revealed, stats.cycleDay, stats.smoothedCycle]);

  const addLog = () => {
    if (!form.start) return;
    if (form.end && form.end < form.start) { setError("End date can't be before start date."); return; }
    const next = [...logs, { start: form.start, end: form.end || null }];
    persist(next);
    showToast("Period logged — calendar, forecast and advice updated");
    setForm({ start: todayISO(), end: "" });
    setShowForm(false);
    setError("");
  };

  const deleteLog = async (id) => { if (!authUser) return; const { error: deleteError } = await supabase.from("period_logs").delete().eq("user_id", authUser.id).eq("id", id); if (deleteError) { setError(`Could not delete period entry: ${deleteError.message}`); return; } setLogs(prev => prev.filter(l => l.id !== id)); showToast("Entry removed — predictions updated"); };

  const doSpin = () => {
    if (!stats.cycleDay) return;
    setSpinning(true);
    setRevealed(false);
    const markerAngle = markerAngleFor(stats.cycleDay, stats.smoothedCycle);
    const target = 4 * 360 + (-90 - markerAngle);
    setRotation(target);
    spinTimeout.current = setTimeout(() => { setSpinning(false); setRevealed(true); }, 2450);
  };

  const toggleHealthIssue = (issue) => {
    setProfileDraft((p) => {
      const has = p.healthIssues.includes(issue);
      return { ...p, healthIssues: has ? p.healthIssues.filter((h) => h !== issue) : [...p.healthIssues, issue] };
    });
  };

  const hasProfileInfo = !!(profile.name || profile.weight || profile.height || profile.age);

  // Refreshes saved data and resets the meal carousel.
  const invalidateTips = () => {
    setMealIndex({ breakfast: 0, lunch: 0, dinner: 0 });
    setRefreshTick((t) => t + 1);
  };
  const refreshAll = async () => {
    if (!authUser) return;
    setRefreshing(true);
    try {
      const [periodResult, profileResult, checkinResult] = await Promise.all([
        supabase.from("period_logs").select("id,start_date,end_date").eq("user_id", authUser.id).order("start_date", { ascending: false }),
        supabase.from("profiles").select("id,name,age,weight,height,health_issues,sleep_hours,stress_level,activity_level,dietary_preference").eq("id", authUser.id).maybeSingle(),
        supabase.from("daily_checkins").select("id,checkin_date,mood,symptoms,digestion,factors").eq("user_id", authUser.id).order("checkin_date", { ascending: false }),
      ]);
      if (periodResult.error) throw periodResult.error;
      if (profileResult.error) throw profileResult.error;
      if (checkinResult.error) throw checkinResult.error;
      setLogs((periodResult.data || []).map(row => ({ id: row.id, start: row.start_date, end: row.end_date || null })));
      setCheckins((checkinResult.data || []).map(row => ({ id: row.id, date: row.checkin_date, mood: row.mood || [], symptoms: row.symptoms || [], digestion: row.digestion || [], factors: row.factors || [] })));
      if (profileResult.data) { const r = profileResult.data; const p = { ...defaultProfile, name:r.name||"", email:authUser.email||"", age:r.age||"", weight:r.weight||"", height:r.height||"", healthIssues:r.health_issues||[], sleepHours:r.sleep_hours||"", stressLevel:r.stress_level||"", activityLevel:r.activity_level||"", dietaryPreference:r.dietary_preference||"" }; setProfile(p); setProfileDraft(p); }
      invalidateTips(); setCloudError(""); showToast("Your account data has been refreshed");
    } catch (e) { setError(`Refresh failed: ${e.message}`); }
    finally { setTimeout(() => setRefreshing(false), 500); }
  };

  const finishOnboarding = () => {
    if (hasProfileInfo) { setShowIntro(false); return; }
    setOnboardStep("profile");
  };
  const continueOnboardingProfile = () => {
    persistProfile(profileDraft);
    invalidateTips();
    setShowIntro(false);
  };
  const skipOnboardingProfile = () => {
    persistProfile(profileDraft); // keep whatever they did fill in
    invalidateTips();
    setShowIntro(false);
  };

  const openProfileEditor = () => { setProfileDraft(profile); setShowProfile(true); };
  const saveProfileEditor = () => { persistProfile(profileDraft); invalidateTips(); showToast("Profile saved — diet, targets and advice updated"); setShowProfile(false); };

  const phase = stats.phase ? PHASES[stats.phase] : null;
  // All recommendations are built into the app; no external AI service is called.
  const fallbackData = stats.phase ? buildFallback(stats.phase, profile) : null;
  const data = fallbackData;
  const dietKey = profile.dietaryPreference || "No preference";
  const profileChips = [
    profile.activityLevel,
    profile.sleepHours ? `Sleep ${profile.sleepHours}` : "",
    profile.stressLevel ? `${profile.stressLevel} stress` : "",
    profile.healthIssues && profile.healthIssues.length ? `${profile.healthIssues.length} health note${profile.healthIssues.length > 1 ? "s" : ""}` : "",
  ].filter(Boolean);
  const sortedLogs = [...logs].sort((a, b) => (a.start < b.start ? 1 : -1));
  const sortedLogsAsc = [...sortedLogs].reverse();
  const hasLogs = logs.length > 0;
  const months = [...new Set(logs.map((l) => monthKey(l.start)))].sort().reverse();
  const greet = timeGreeting();

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito:wght@400;600;700&display=swap');
        * { box-sizing: border-box; }
        button { font-family: 'Nunito', sans-serif; cursor: pointer; }
        input[type="date"], input[type="number"], input[type="text"], select { font-family: 'Nunito', sans-serif; }
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.85) translateY(6px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes floatBlob { 0%,100% { transform: translate(0,0); } 50% { transform: translate(8px,-10px); } }
        .pop { animation: popIn 0.45s cubic-bezier(.2,.7,.3,1.2); }
        @keyframes refreshSpin { to { transform: rotate(360deg); } }
        .refresh-spin { animation: refreshSpin 0.9s linear; }

        @keyframes introFloatUp { 0% { transform: translateY(0) rotate(0deg); opacity: 0; } 10% { opacity: 0.85; } 85% { opacity: 0.6; } 100% { transform: translateY(-110vh) rotate(30deg); opacity: 0; } }
        .intro-petal { position: absolute; bottom: -40px; pointer-events: none; animation: introFloatUp linear infinite; }
        @keyframes introPop { 0% { transform: scale(0.3); opacity: 0; } 55% { transform: scale(1.15); opacity: 1; } 75% { transform: scale(0.93); } 100% { transform: scale(1); opacity: 1; } }
        .intro-mascot-pop { animation: introPop 0.85s cubic-bezier(.22,.9,.3,1.25); }
        @keyframes introRise { 0% { opacity: 0; transform: translateY(18px); } 100% { opacity: 1; transform: translateY(0); } }
        .intro-line { opacity: 0; animation: introRise 0.6s ease forwards; }
        @keyframes introBtnPulse { 0%, 100% { box-shadow: 0 4px 14px rgba(255,107,157,0.35); transform: scale(1); } 50% { box-shadow: 0 8px 26px rgba(255,107,157,0.55); transform: scale(1.04); } }
        .intro-btn { opacity: 0; animation: introRise 0.6s ease forwards 1.1s, introBtnPulse 2.2s ease-in-out infinite 1.9s; }
      `}</style>

      <div style={{ position: "fixed", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(circle,#FFD23F55,transparent 70%)", animation: "floatBlob 7s ease-in-out infinite", zIndex: 0 }} />
      <div style={{ position: "fixed", bottom: -50, left: -50, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,#B892FF44,transparent 70%)", animation: "floatBlob 8s ease-in-out infinite reverse", zIndex: 0 }} />

      {cloudError && <div role="alert" style={{ ...styles.noteCard, margin: "12px auto", maxWidth: 900 }}>{cloudError}</div>}
      <header style={styles.headerWrap}>
        <div style={styles.headerTopRow}>
          <div style={styles.brand}>
            <Mascot size={34} wave={false} />
            <span style={styles.brandText}>Bloom</span>
          </div>
          <div style={styles.headerActions}>
            <button style={styles.profileBtn} onClick={refreshAll} aria-label="Refresh data" title="Refresh data">
              <span className={refreshing ? "refresh-spin" : ""} style={{ display: "inline-block" }}>🔄</span>
            </button>
            <button style={styles.profileBtn} onClick={openProfileEditor} aria-label="Your profile">👤</button>
          </div>
        </div>
        <nav style={styles.navRow}>
          <button onClick={() => setView("dashboard")} style={{ ...styles.navBtn, ...(view === "dashboard" ? styles.navBtnActive : {}) }}>Today</button>
          <button onClick={() => setView("diet")} style={{ ...styles.navBtn, ...(view === "diet" ? styles.navBtnActive : {}) }}>Diet</button>
          <button onClick={() => setView("yoga")} style={{ ...styles.navBtn, ...(view === "yoga" ? styles.navBtnActive : {}) }}>Yoga</button>
          <button onClick={() => setView("history")} style={{ ...styles.navBtn, ...(view === "history" ? styles.navBtnActive : {}) }}>History</button>
          <button onClick={() => setView("checkin")} style={{ ...styles.navBtn, ...(view === "checkin" ? styles.navBtnActive : {}) }}>Check-in</button>
          <button onClick={() => setView("learn")} style={{ ...styles.navBtn, ...(view === "learn" ? styles.navBtnActive : {}) }}>Learn</button>
          <button onClick={() => setView("care")} style={{ ...styles.navBtn, ...(view === "care" ? styles.navBtnActive : {}) }}>Care</button>
          <button onClick={() => setView("about")} style={{ ...styles.navBtn, ...(view === "about" ? styles.navBtnActive : {}) }}>About</button>
          <button onClick={() => setView("privacy")} style={{ ...styles.navBtn, ...(view === "privacy" ? styles.navBtnActive : {}) }}>Privacy</button>
          <button onClick={() => setView("terms")} style={{ ...styles.navBtn, ...(view === "terms" ? styles.navBtnActive : {}) }}>Terms</button>
        </nav>
      </header>

      {!loaded ? (
        <div style={styles.loading}>Loading your data…</div>
      ) : view === "dashboard" ? (
        <main style={styles.main}>
          {!hasLogs ? (
            <div style={styles.emptyCard}>
              <Mascot size={90} />
              <h2 style={styles.emptyTitle}>Welcome to Bloom! 🌸</h2>
              <p style={styles.emptyText}>Log your first period and I'll start predicting your cycle and picking phase-by-phase tips just for you.</p>
              <button style={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Log period</button>
            </div>
          ) : (
            <>
              <MiniCalendar sortedLogsAsc={sortedLogsAsc} stats={stats} />

              <div style={{ ...styles.card, textAlign: "center", position: "relative", zIndex: 1 }}>
                <BloomWheel stats={stats} rotation={rotation} spinning={spinning} />
                {!revealed && !spinning && (
                  <button style={{ ...styles.primaryBtn, marginTop: 14 }} onClick={doSpin}>🎡 Spin to see today's phase</button>
                )}
                {spinning && <div style={styles.spinningNote}>spinning…</div>}
                {revealed && phase && (
                  <div className="pop">
                    <div style={{ ...styles.phaseBadge, background: phase.soft, color: phase.color, marginTop: 10 }}>
                      {phase.emoji} {phase.name} phase{stats.overdueDays > 0 ? ` · ${stats.overdueDays}d late` : ""}
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button style={styles.linkOutBtn} onClick={() => setView("diet")}>🍽️ See diet plan</button>
                      <button style={styles.linkOutBtn} onClick={() => setView("yoga")}>🧘 See yoga plan</button>
                    </div>
                  </div>
                )}
                <div style={styles.legendRow}>
                  {Object.values(PHASES).map((p) => (
                    <div key={p.name} style={styles.legendItem}><span style={{ ...styles.legendDot, background: p.color }} /> {p.name}</div>
                  ))}
                </div>
              </div>

              <section style={styles.tipsCard}>
                <h3 style={styles.tipsTitle}>🌷 Daily check-in</h3>
                <p style={styles.emptyText}>A gentle space to note how you feel today. Select anything that applies.</p>
                <label style={styles.formLabel}>Date<input type="date" value={checkinDate} onChange={e => loadCheckin(e.target.value)} style={styles.input}/></label>
                {[['Mood', ['Calm','Happy','Energetic','Mood swings','Sad','Anxious','Confused','Depressed'],checkinMood,setCheckinMood],['Physical symptoms',['Cramps','Tender breasts','Cravings','Headache','Backache','Insomnia','Fatigue','Brain fog'],checkinSymptoms,setCheckinSymptoms],['Digestion',['Nausea','Bloating','Constipation','Diarrhoea'],checkinDigestive,setCheckinDigestive],['Other factors',['Travel','Stress','Alcohol','Illness','Injury'],checkinFactors,setCheckinFactors]].map(([label,opts,values,setter]) => <div key={label} style={{marginBottom:12}}><div style={styles.subLabel}>{label}</div><div style={{display:'flex',flexWrap:'wrap',gap:7}}>{opts.map(option => <button key={option} type="button" onClick={() => toggleChoice(setter,values,option)} style={{...styles.issueChip,...(values.includes(option)?styles.issueChipActive:{})}}>{option}</button>)}</div></div>)}
                <button style={styles.primaryBtn} onClick={saveCheckin}>Save today's check-in</button>
                {checkins.some(x=>x.date===checkinDate) && <p style={{...styles.caveatText,marginTop:8}}>A check-in for this date already exists. Saving will update it.</p>}
              </section>

              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Next period</div>
                  <div style={styles.statValue}>{stats.nextPredictedStart ? fmtDate(stats.nextPredictedStart) : "–"}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Avg cycle</div>
                  <div style={styles.statValue}>{stats.smoothedCycle}d {stats.stdDev > 0 && <span style={styles.statSub}>±{stats.stdDev}d</span>}</div>
                </div>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Confidence</div>
                  <div style={styles.statValue}>{stats.confidence === "high" ? "High 🎯" : stats.confidence === "moderate" ? "Moderate 📈" : "Building 🌱"}</div>
                </div>
              </div>

              {stats.confidence === "building" && <div style={styles.noteCard}>Log a couple more cycles and predictions get noticeably sharper.</div>}
              {stats.stdDev > 7 && stats.confidence !== "building" && (
                <div style={styles.noteCard}>Your cycle length has varied by more than a week between cycles — worth mentioning to a doctor if that's new for you.</div>
              )}

              <div style={{ borderTop: "1px solid #FBEAF0", paddingTop: 4 }} />
              <h3 style={styles.sectionHeading}>📅 Forecast</h3>
              <p style={{ ...styles.emptyText, marginTop: -8 }}>
                Projected forward from your last logged period using your smoothed average cycle length. Uncertainty widens the further out we predict.
              </p>
              {forecast.map((f) => (
                <div key={f.cycleNum} style={styles.forecastCard}>
                  <div style={styles.forecastHeader}>
                    <span style={styles.forecastCycleLabel}>Cycle +{f.cycleNum}</span>
                    <span style={styles.forecastUncertainty}>±{f.uncertainty}d</span>
                  </div>
                  <div style={styles.forecastRow}><span>🌸 Period</span><strong>{fmtDate(f.periodStart)}</strong></div>
                  <div style={styles.forecastRow}><span>☀️ Ovulation (est.)</span><strong>{fmtDate(f.ovulation)}</strong></div>
                  <div style={styles.forecastRow}><span>🌿 Fertile window</span><strong>{fmtDate(f.fertileStart)} – {fmtDate(f.fertileEnd)}</strong></div>
                </div>
              ))}
              {stats.confidence === "building" && (
                <div style={styles.noteCard}>These early forecasts are rough — accuracy improves a lot after 3-4 logged cycles.</div>
              )}

              <button style={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Log period</button>
            </>
          )}
        </main>
      ) : view === "diet" ? (
        <main style={styles.main}>
          <h2 style={styles.historyTitle}>🍽️ Your diet plan</h2>
          {!hasLogs || !data ? (
            <p style={styles.emptyText}>Log at least one period on the Today tab to get phase-based meals.</p>
          ) : (
            <>
              <PhaseContextLine phase={phase} stats={stats} />

              {nutrition ? (
                <div style={styles.tipsCard}>
                  <div style={styles.subLabel}>Your reference numbers</div>
                  <div style={styles.nutritionLine}>Healthy weight range for your height: <strong>{nutrition.healthyLow}–{nutrition.healthyHigh} kg</strong></div>
                  <div style={styles.nutritionLine}>Estimated daily target: <strong>~{nutrition.targetCalories} kcal · {nutrition.targetProtein}g protein</strong> ({nutrition.goal})</div>
                  <div style={styles.caveatText}>
                    Based on standard formulas (Mifflin-St Jeor) from your profile — a general population estimate, not personalized medical or nutrition advice.
                    {profile.healthIssues && profile.healthIssues.length > 0 ? ` With ${profile.healthIssues.join(", ")}, actual needs can differ — a doctor or dietitian can give a more accurate number.` : ""}
                  </div>
                </div>
              ) : (
                <div style={styles.noteCard}>
                  Add your age, weight & height in your profile to see a personalized calorie & protein target.
                  <button style={{ ...styles.linkOutBtn, marginTop: 10 }} onClick={openProfileEditor}>Complete profile</button>
                </div>
              )}

              <div style={styles.tipsCard}>
                <h3 style={{ ...styles.tipsTitle, color: phase.color }}>
                  Meals for your {phase.name.toLowerCase()} phase
                  
                </h3>
                <div style={styles.dietTag}>Menu for: {dietKey}</div>
                <div style={styles.dietNote}>{DIET_NOTE[dietKey]}</div>
                <div style={styles.mealGrid}>
                  <MealCard label="Breakfast" icon="🌅" items={data.breakfast} index={mealIndex.breakfast}
                    onRefresh={() => setMealIndex((m) => ({ ...m, breakfast: m.breakfast + 1 }))} />
                  <MealCard label="Lunch" icon="🌞" items={data.lunch} index={mealIndex.lunch}
                    onRefresh={() => setMealIndex((m) => ({ ...m, lunch: m.lunch + 1 }))} />
                  <MealCard label="Dinner" icon="🌙" items={data.dinner} index={mealIndex.dinner}
                    onRefresh={() => setMealIndex((m) => ({ ...m, dinner: m.dinner + 1 }))} />
                </div>
                <div style={styles.caveatText}>Calories & protein are approximate per-serving estimates — actual values vary by portion and recipe.</div>
                {data.avoid && data.avoid.length > 0 && (
                  <>
                    <div style={styles.subLabel}>Go easy on</div>
                    <div>{data.avoid.map((f, i) => <Chip key={i} item={f} tone="limit" />)}</div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      ) : view === "yoga" ? (
        <main style={styles.main}>
          <h2 style={styles.historyTitle}>🧘 Yoga & self-care</h2>
          {!hasLogs || !data ? (
            <p style={styles.emptyText}>Log at least one period on the Today tab to get phase-based guidance.</p>
          ) : (
            <>
              <PhaseContextLine phase={phase} stats={stats} />

              {profileChips.length > 0 && (
                <div style={styles.chipRow}>
                  <span>Based on your profile:</span>
                  {profileChips.map((x) => <span key={x} style={styles.profileChip}>{x}</span>)}
                </div>
              )}

              {data.dailySteps && (
                <div style={styles.stepsCard}>
                  <span style={{ fontSize: 22 }}>👣</span>
                  <div>
                    <div style={styles.stepsLabel}>Daily steps</div>
                    <div style={styles.stepsValue}>{data.dailySteps}</div>
                  </div>
                </div>
              )}

              <div style={styles.tipsCard}>
                <h3 style={{ ...styles.tipsTitle, color: phase.color }}>Yoga for this phase</h3>
                <p style={styles.tipText}>{data.move}</p>
                <div style={styles.yogaGrid}>
                  {data.yoga.map((y, i) => (
                    <div key={i} style={styles.yogaCard}>
                      <div style={styles.yogaTop}>
                        <span style={{ fontSize: 22 }}>{y.emoji}</span>
                        <span style={styles.yogaDuration}>{y.duration}</span>
                      </div>
                      <div style={styles.yogaName}>{y.name}</div>
                      <div style={styles.yogaBenefit}>{y.benefit}</div>
                      <div style={styles.yogaHowTo}>{y.howTo}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={styles.tipsCard}>
                <h3 style={{ ...styles.tipsTitle, color: phase.color }}>💛 Self-care</h3>
                {[["Physical", "🌿", data.selfCare.physical], ["Emotional", "💭", data.selfCare.emotional], ["Sleep", "😴", data.selfCare.sleep]].map(([label, icon, tips]) => (
                  <div key={label} style={{ marginBottom: 12 }}>
                    <div style={styles.selfCareCategory}>{icon} {label}</div>
                    {tips.map((tip, i) => (
                      <div key={i} style={styles.selfCareRow}>
                        <span style={{ color: phase.color, fontWeight: 800 }}>•</span>
                        <span style={styles.tipText}>{tip}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}
        </main>
      ) : view === "checkin" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>🌷 Check-in history</h2><p style={styles.emptyText}>Your check-ins are saved to your Bloom account and can be edited or deleted by date.</p>{checkins.length===0?<p style={styles.emptyText}>No check-ins saved yet.</p>:checkins.map(entry=><article key={entry.date} style={styles.tipsCard}><div style={{display:'flex',justifyContent:'space-between',gap:8}}><strong>{fmtDate(entry.date)}</strong><button style={styles.deleteBtn} onClick={()=>deleteCheckin(entry.date)}>Delete</button></div>{[['Mood',entry.mood],['Symptoms',entry.symptoms],['Digestion',entry.digestion],['Other factors',entry.factors]].filter(x=>x[1]?.length).map(([k,v])=><p style={styles.tipText} key={k}><b>{k}:</b> {v.join(', ')}</p>)}<button style={{...styles.linkOutBtn,marginTop:8}} onClick={()=>{loadCheckin(entry.date);setView('dashboard');}}>Edit entry</button></article>)}</main>
      ) : view === "learn" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>📚 Understanding menstruation</h2><p style={styles.tipText}>Menstruation is the monthly shedding of the uterine lining when pregnancy has not occurred. A menstrual cycle is counted from the first day of one period to the first day of the next.</p>{[['The four phases','Menstrual: the uterine lining sheds. Follicular: a new egg begins developing and the lining starts rebuilding. Ovulation: an ovary releases an egg. Luteal: progesterone rises and the lining is maintained; if pregnancy does not occur, hormone levels fall and another period begins.'],['Why periods happen','Hormones coordinate the ovaries and uterus. If pregnancy does not occur, the thickened uterine lining is shed through the vagina.'],['Common experiences','Cramps, breast tenderness, bloating, headaches, acne, fatigue and mood changes can occur. Experiences differ from person to person and from cycle to cycle.'],['Menstrual hygiene','Wash hands before and after changing products. Clean the external vulva gently with water; avoid douching or scented products inside the vagina. Change products regularly and follow product instructions.'],['When to seek care','Seek medical advice for very heavy bleeding, severe or worsening pain, fainting, fever, unusual discharge, or a major change from your usual pattern.']].map(([h,t])=><article key={h} style={styles.tipsCard}><h3 style={styles.tipsTitle}>{h}</h3><p style={styles.tipText}>{t}</p></article>)}<p style={styles.caveatText}>Cycle phases and dates shown by Bloom are estimates, not confirmation of ovulation or contraception.</p></main>
      ) : view === "care" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>💗 Period care & comfort</h2>{[['Pads','Change about every 4–6 hours, or sooner if saturated. Wrap used pads and place them in a bin; do not flush.'],['Tampons','Use the lowest absorbency needed and change every 4–8 hours. Never leave one in longer than 8 hours. Wash hands before and after; seek urgent care if sudden fever, rash, vomiting, dizziness or severe illness occurs.'],['Menstrual cups','Empty according to the product instructions and your flow (often every 4–12 hours). Wash hands, clean and sterilise as directed by the manufacturer, and store dry in its pouch.'],['Period underwear','Follow the care label. Rinse if advised, wash with detergent and dry fully before reuse.'],['Cramps: non-medicine comfort','A warm pack, gentle movement, rest and fluids may help. Stop movement if it increases pain.'],['Medicines: general information','Ibuprofen and naproxen are NSAIDs that reduce prostaglandins and may help cramps; they can irritate the stomach and are not suitable for everyone, including some people with ulcers, kidney disease, blood-thinner use or certain pregnancy situations. Paracetamol can help pain but does not reduce inflammation; excess can seriously harm the liver. Ask a pharmacist or clinician what is suitable for you and follow the package label. Bloom does not provide doses or prescriptions.'],['Gentle yoga','Child’s Pose, Reclined Butterfly, Cat–Cow and Supine Twist may feel soothing. Move gently, use cushions and stop if uncomfortable.']].map(([h,t])=><article key={h} style={styles.tipsCard}><h3 style={styles.tipsTitle}>{h}</h3><p style={styles.tipText}>{t}</p></article>)}<div style={styles.noteCard}>This is general education, not diagnosis or treatment. Severe, new or worsening pain, very heavy bleeding, fainting or symptoms that disrupt daily life deserve medical assessment.</div></main>
      ) : view === "about" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>🌸 About Bloom</h2><article style={styles.tipsCard}><p style={styles.tipText}>Bloom is a menstrual wellness companion designed to help you record periods, understand cycle patterns and reflect on everyday wellbeing. It combines period logging, calendar estimates, cycle history, mood and symptom check-ins, phase-informed food ideas, gentle movement and educational resources.</p><p style={styles.tipText}>Bloom is designed to make cycle information easier to understand. It does not diagnose conditions such as PCOS or endometriosis, confirm ovulation, or guarantee the date of a future period.</p></article><article style={styles.tipsCard}><h3 style={styles.tipsTitle}>Contact Bloom</h3><p style={styles.tipText}><b>Aditi Pathania</b><br/>Nurpur, Himachal Pradesh, India</p><p><a href="tel:9317733987">9317733987</a></p><p><a href="mailto:aditipathania2401@gmail.com">aditipathania2401@gmail.com</a></p><p><a href="https://www.google.com/maps/search/?api=1&query=Nurpur%2C%20Himachal%20Pradesh%2C%20India" target="_blank" rel="noreferrer">View location</a></p></article></main>
      ) : view === "privacy" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>🔒 Privacy Policy</h2><article style={styles.tipsCard}><p style={styles.tipText}>Bloom may store the information you enter, such as profile details, period dates, cycle history and check-in notes. In this delivered version, cycle and profile data use this browser’s local storage; check-in entries are also saved in local storage on this device. Anyone with access to this browser profile or device may be able to access that data.</p><p style={styles.tipText}>Do not enter information you are uncomfortable storing on this device. Clearing browser site data may delete locally stored information. Bloom does not intentionally sell your personal information. Do not assume data is encrypted or backed up by Bloom. If the app is later connected to a cloud database, this policy must be updated to describe the provider, access controls, retention and deletion process.</p><p style={styles.tipText}>The app may use essential browser storage to remember your entries and preferences. Contact: <a href="mailto:aditipathania2401@gmail.com">aditipathania2401@gmail.com</a>.</p></article></main>
      ) : view === "terms" ? (
        <main style={styles.main}><h2 style={styles.historyTitle}>📄 Terms & Conditions</h2><article style={styles.tipsCard}><p style={styles.tipText}>By using Bloom, you agree to use it as an informational period-tracking and wellness tool. You are responsible for entering accurate dates, protecting access to your device and reviewing your entries.</p><p style={styles.tipText}>Cycle length, period dates, fertile windows and phase labels are estimates based on the dates entered. They can be inaccurate, especially with irregular cycles or limited history. Do not use Bloom to prevent or plan pregnancy.</p><p style={styles.tipText}>Diet, exercise, yoga and medicine information is general education only, not medical advice, diagnosis, prescription or a substitute for a qualified healthcare professional. Stop any activity that causes pain and seek medical advice for concerning symptoms.</p><p style={styles.tipText}>You should not share your device or account credentials. Local data may be lost if browser storage is cleared or the device is changed. Bloom may update these terms as features change. For questions, contact <a href="mailto:aditipathania2401@gmail.com">aditipathania2401@gmail.com</a>.</p></article></main>
      ) : (
        <main style={styles.main}>
          <h2 style={styles.historyTitle}>Cycle history</h2>
          {sortedLogs.length === 0 && <p style={styles.emptyText}>No entries yet.</p>}
          {sortedLogs.map((l, i) => {
            const prev = sortedLogs[i + 1];
            const cycleLen = prev ? daysBetween(prev.start, l.start) : null;
            return (
              <div key={l.id} style={styles.historyRow}>
                <div>
                  <div style={styles.historyDate}>{parseISO(l.start).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</div>
                  <div style={styles.historySub}>{l.end ? `${daysBetween(l.start, l.end) + 1}d period` : "no end logged"}{cycleLen ? ` · ${cycleLen}d cycle` : ""}</div>
                </div>
                <button style={styles.deleteBtn} onClick={() => deleteLog(l.id)}>✕</button>
              </div>
            );
          })}

          {months.length > 0 && (
            <div style={styles.clearCard}>
              <div style={styles.subLabel}>Clear a month (accidental entries)</div>
              <div style={{ display: "flex", gap: 8 }}>
                <select
                  value={clearMonth || months[0]}
                  onChange={(e) => { setClearMonth(e.target.value); setConfirmClear(false); }}
                  style={{ ...styles.input, flex: 1 }}
                >
                  {months.map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
                </select>
                <button style={styles.dangerBtn} onClick={() => setConfirmClear(true)}>Clear</button>
              </div>
              {confirmClear && (
                <div style={styles.confirmRow}>
                  <span style={styles.confirmText}>
                    Delete {logs.filter((l) => monthKey(l.start) === (clearMonth || months[0])).length} entr{logs.filter((l) => monthKey(l.start) === (clearMonth || months[0])).length === 1 ? "y" : "ies"} from {monthLabel(clearMonth || months[0])}?
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button style={styles.secondaryBtn} onClick={() => setConfirmClear(false)}>Cancel</button>
                    <button style={styles.dangerBtn} onClick={() => {
                      const key = clearMonth || months[0];
                      persist(logs.filter((l) => monthKey(l.start) !== key));
                      showToast("Month cleared — predictions updated");
                      setConfirmClear(false);
                    }}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          )}

          <button style={styles.primaryBtn} onClick={() => setShowForm(true)}>+ Log period</button>
        </main>
      )}

      {loaded && showIntro && onboardStep === "greet" && (
        <div style={styles.fullIntro}>
          <span className="intro-petal" style={{ left: "6%", fontSize: 22, animationDuration: "9s", animationDelay: "0s" }}>🌸</span>
          <span className="intro-petal" style={{ left: "20%", fontSize: 16, animationDuration: "7s", animationDelay: "1.1s" }}>✨</span>
          <span className="intro-petal" style={{ left: "38%", fontSize: 26, animationDuration: "10.5s", animationDelay: "0.4s" }}>🌷</span>
          <span className="intro-petal" style={{ left: "55%", fontSize: 18, animationDuration: "8s", animationDelay: "2s" }}>💮</span>
          <span className="intro-petal" style={{ left: "72%", fontSize: 22, animationDuration: "11s", animationDelay: "0.7s" }}>🌸</span>
          <span className="intro-petal" style={{ left: "88%", fontSize: 16, animationDuration: "9.5s", animationDelay: "1.6s" }}>✨</span>
          <span className="intro-petal" style={{ left: "46%", fontSize: 18, animationDuration: "8.5s", animationDelay: "2.6s" }}>🌷</span>

          <div className="intro-mascot-pop">
            <Mascot size={150} />
          </div>
          <h1 className="intro-line" style={{ ...styles.modalTitle, fontSize: 26, marginTop: 14, animationDelay: "0.35s" }}>
            {profile.name ? `Welcome, ${profile.name}!` : "Hi, I'm Bloom!"} 👋
          </h1>
          <div className="intro-line" style={{ ...styles.greetingLine, fontSize: 16, animationDelay: "0.6s" }}>{greet.emoji} {greet.text}</div>
          <div className="intro-line" style={{ ...styles.tagline, fontSize: 17, animationDelay: "0.85s" }}>Keep blooming 🌸</div>
          <button className="intro-line intro-btn" style={{ ...styles.primaryBtn, marginTop: 22, maxWidth: 220 }} onClick={finishOnboarding}>Explore Bloom 🌸</button>
        </div>
      )}

      {loaded && showIntro && onboardStep === "profile" && (
        <div style={styles.overlay}>
          <div style={styles.modal} className="pop">
            <h3 style={styles.modalTitle}>Let's personalize Bloom 🌸</h3>
            <p style={{ ...styles.emptyText, marginTop: -6 }}>
              This helps me tailor your predictions, meals, and advice. Nothing here is a diagnosis, and you can change it anytime from the 👤 icon.
            </p>
            <ProfileFields draft={profileDraft} setDraft={setProfileDraft} onToggleHealth={toggleHealthIssue} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={styles.secondaryBtn} onClick={skipOnboardingProfile}>Skip for now</button>
              <button style={styles.primaryBtn} onClick={continueOnboardingProfile}>Continue</button>
            </div>
          </div>
        </div>
      )}

      {showProfile && (
        <div style={styles.overlay} onClick={() => setShowProfile(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Your profile</h3>
            <p style={{ ...styles.emptyText, marginTop: -6 }}>Optional — helps Bloom tailor suggestions a little better. Nothing here is a diagnosis.</p>
            <ProfileFields draft={profileDraft} setDraft={setProfileDraft} onToggleHealth={toggleHealthIssue} />
            <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
              <button style={styles.secondaryBtn} onClick={() => setShowProfile(false)}>Cancel</button>
              <button style={styles.primaryBtn} onClick={saveProfileEditor}>Save</button>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div style={styles.overlay} onClick={() => setShowForm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Log period</h3>
            <label style={styles.formLabel}>Start date
              <input type="date" value={form.start} max={todayISO()} onChange={(e) => setForm({ ...form, start: e.target.value })} style={styles.input} />
            </label>
            <label style={styles.formLabel}>End date (optional)
              <input type="date" value={form.end} max={todayISO()} onChange={(e) => setForm({ ...form, end: e.target.value })} style={styles.input} />
            </label>
            {error && <div style={styles.errorText}>{error}</div>}
            <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
              <button style={styles.secondaryBtn} onClick={() => { setShowForm(false); setError(""); }}>Cancel</button>
              <button style={styles.primaryBtn} onClick={addLog}>Save</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div style={styles.toast} role="status">{toast}</div>}
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "linear-gradient(180deg, #FFF9F5 0%, #FFF1F6 100%)", fontFamily: "'Nunito', sans-serif", color: "#3D1F3D", paddingBottom: 110, position: "relative", overflow: "hidden" },
  headerWrap: { position: "relative", zIndex: 1, padding: "16px 18px 10px", display: "flex", flexDirection: "column", gap: 10 },
  headerTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  brand: { display: "flex", alignItems: "center", gap: 8 },
  brandText: { fontFamily: "'Fredoka', sans-serif", fontSize: 22, fontWeight: 600, color: "#E63462" },
  navRow: { overflowX: "auto", whiteSpace: "nowrap", display: "flex", gap: 6, background: "#fff", padding: 4, borderRadius: 999, boxShadow: "0 2px 8px rgba(230,52,98,0.08)" },
  navBtn: { flex: 1, border: "none", background: "transparent", padding: "8px 4px", borderRadius: 999, fontWeight: 700, fontSize: 12.5, color: "#B892A8", whiteSpace: "nowrap" },
  navBtnActive: { background: "#FF6B9D", color: "#fff" },
  dietNote: { fontSize: 12, color: "#8A6A80", margin: "-4px 0 10px", lineHeight: 1.4 },
  chipRow: { display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#8A6A80" },
  profileChip: { background: "#FFF1F6", color: "#E63462", borderRadius: 999, padding: "3px 10px", fontSize: 11.5, fontWeight: 700 },
  toast: { position: "fixed", left: "50%", bottom: 100, transform: "translateX(-50%)", background: "#3D1F3D", color: "#fff", padding: "10px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 90, boxShadow: "0 6px 20px rgba(61,31,61,0.3)", pointerEvents: "none", maxWidth: "88vw", textAlign: "center" },
  headerActions: { display: "flex", alignItems: "center", gap: 8 },
  profileBtn: { width: 38, height: 38, borderRadius: "50%", border: "none", background: "#fff", boxShadow: "0 2px 8px rgba(230,52,98,0.08)", fontSize: 16, flexShrink: 0 },
  loading: { textAlign: "center", padding: 60, color: "#B892A8" },
  main: { maxWidth: 460, margin: "0 auto", padding: "0 18px", display: "flex", flexDirection: "column", gap: 16, position: "relative", zIndex: 1 },
  card: { background: "#fff", borderRadius: 24, padding: 22, boxShadow: "0 4px 20px rgba(230,52,98,0.08)" },
  emptyCard: { background: "#fff", borderRadius: 24, padding: "36px 24px", textAlign: "center", boxShadow: "0 4px 20px rgba(230,52,98,0.08)" },
  emptyTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 19, margin: "10px 0 8px" },
  emptyText: { color: "#8A6A80", fontSize: 14, lineHeight: 1.5, margin: "0 0 18px" },
  greetingLine: { fontSize: 14, fontWeight: 700, color: "#B892A8", margin: "0 0 4px" },
  tagline: { fontFamily: "'Fredoka', sans-serif", fontSize: 14, color: "#FF6B9D", marginTop: 4, fontWeight: 600 },
  sectionHeading: { fontFamily: "'Fredoka', sans-serif", fontSize: 17, margin: "4px 0 0" },
  phaseBadge: { display: "inline-block", padding: "6px 16px", borderRadius: 999, fontWeight: 700, fontSize: 13 },
  phaseContextLine: { fontSize: 13, fontWeight: 700, color: "#8A6A80" },
  spinningNote: { fontSize: 13, color: "#B892A8", fontWeight: 700, marginTop: 14 },
  legendRow: { display: "flex", justifyContent: "center", gap: 14, marginTop: 16, flexWrap: "wrap" },
  legendItem: { display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "#8A6A80", fontWeight: 700 },
  legendDot: { width: 8, height: 8, borderRadius: "50%", display: "inline-block" },
  statsGrid: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 },
  statCard: { background: "#fff", borderRadius: 18, padding: "14px 10px", textAlign: "center", boxShadow: "0 4px 20px rgba(230,52,98,0.06)" },
  statLabel: { fontSize: 11, color: "#B892A8", fontWeight: 700, marginBottom: 4 },
  statValue: { fontFamily: "'Fredoka', sans-serif", fontSize: 17, fontWeight: 600 },
  statSub: { fontSize: 11, color: "#B892A8", fontWeight: 400 },
  noteCard: { background: "#FFF6DC", borderRadius: 16, padding: "12px 16px", fontSize: 13, color: "#7A5C1A", lineHeight: 1.5 },
  calHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  calNavBtn: { background: "#FFF1F6", border: "none", color: "#E63462", width: 30, height: 30, borderRadius: "50%", fontSize: 16, fontWeight: 700 },
  calMonthLabel: { fontFamily: "'Fredoka', sans-serif", fontSize: 15, fontWeight: 600 },
  calWeekRow: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 },
  calWeekday: { textAlign: "center", fontSize: 10.5, fontWeight: 800, color: "#B892A8" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 },
  calCell: { aspectRatio: "1", borderRadius: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1 },
  calDayNum: { fontSize: 11, fontWeight: 700, color: "#3D1F3D" },
  calPhaseDot: { width: 4, height: 4, borderRadius: "50%", display: "inline-block" },
  tipsCard: { background: "#fff", borderRadius: 24, padding: 22, boxShadow: "0 4px 20px rgba(230,52,98,0.08)" },
  tipsTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 16, margin: "0 0 12px" },
  subLabel: { fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5, color: "#B892A8", margin: "10px 0 6px" },
  tipText: { fontSize: 13.5, lineHeight: 1.5, color: "#4A3448", margin: 0 },
  dietTag: { fontSize: 11.5, fontWeight: 700, color: "#2C9A5B", background: "#EFFBF3", display: "inline-block", padding: "4px 10px", borderRadius: 999, marginBottom: 10 },
  nutritionLine: { fontSize: 13.5, color: "#4A3448", lineHeight: 1.6 },
  caveatText: { fontSize: 11, color: "#B892A8", lineHeight: 1.5, marginTop: 8, fontStyle: "italic" },
  stepsCard: { background: "#fff", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 4px 20px rgba(230,52,98,0.06)" },
  stepsLabel: { fontSize: 11, fontWeight: 800, color: "#B892A8", textTransform: "uppercase", letterSpacing: 0.5 },
  stepsValue: { fontSize: 13.5, fontWeight: 700, color: "#3D1F3D" },
  selfCareCategory: { fontSize: 12.5, fontWeight: 800, color: "#3D1F3D", marginBottom: 6 },
  selfCareRow: { display: "flex", gap: 8, marginBottom: 6, paddingLeft: 4 },
  yogaGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  yogaCard: { background: "#FFF9F5", borderRadius: 14, padding: "12px 12px" },
  yogaTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  yogaDuration: { fontSize: 10, fontWeight: 700, color: "#B892A8", background: "#fff", borderRadius: 999, padding: "2px 8px" },
  yogaName: { fontSize: 12.5, fontWeight: 800, margin: "2px 0 2px", color: "#3D1F3D" },
  yogaBenefit: { fontSize: 10.5, color: "#8A6A80", lineHeight: 1.3, marginBottom: 4 },
  yogaHowTo: { fontSize: 10.5, color: "#4A3448", lineHeight: 1.4, fontStyle: "italic" },
  mealGrid: { display: "flex", flexDirection: "column", gap: 10, marginBottom: 4 },
  mealCard: { background: "#FFF9F5", borderRadius: 16, padding: "12px 14px" },
  mealHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  mealLabel: { fontSize: 12, fontWeight: 800, color: "#8A6A80" },
  refreshBtn: { background: "transparent", border: "none", fontSize: 14, padding: 2 },
  mealItem: { fontSize: 13.5, fontWeight: 700, color: "#3D1F3D", display: "flex", alignItems: "center", gap: 8, marginBottom: 4 },
  mealMacros: { fontSize: 11, color: "#B892A8", fontWeight: 700, marginBottom: 6, marginLeft: 28 },
  mealDots: { display: "flex", gap: 4, flexWrap: "wrap" },
  mealDot: { width: 5, height: 5, borderRadius: "50%", display: "inline-block" },
  primaryBtn: { background: "#FF6B9D", color: "#fff", border: "none", borderRadius: 16, padding: "14px 20px", fontWeight: 700, fontSize: 15, width: "100%", boxShadow: "0 4px 14px rgba(255,107,157,0.35)" },
  secondaryBtn: { background: "#F5EAF0", color: "#8A6A80", border: "none", borderRadius: 16, padding: "14px 20px", fontWeight: 700, fontSize: 15, flex: 1 },
  dangerBtn: { background: "#FDEDEA", color: "#C6522F", border: "none", borderRadius: 16, padding: "14px 18px", fontWeight: 700, fontSize: 14 },
  linkOutBtn: { flex: 1, background: "#FFF1F6", color: "#E63462", border: "none", borderRadius: 14, padding: "10px 12px", fontWeight: 700, fontSize: 12.5 },
  historyTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 20, margin: "4px 0 4px" },
  historyRow: { background: "#fff", borderRadius: 16, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", boxShadow: "0 2px 10px rgba(230,52,98,0.06)" },
  historyDate: { fontWeight: 700, fontSize: 14 },
  historySub: { fontSize: 12, color: "#B892A8", marginTop: 2 },
  deleteBtn: { background: "transparent", border: "none", color: "#D8A8B8", fontSize: 16, fontWeight: 700 },
  clearCard: { background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 10px rgba(230,52,98,0.06)" },
  confirmRow: { marginTop: 10, display: "flex", flexDirection: "column", gap: 8 },
  confirmText: { fontSize: 12.5, color: "#C6522F", lineHeight: 1.4 },
  forecastCard: { background: "#fff", borderRadius: 18, padding: "14px 16px", boxShadow: "0 2px 12px rgba(230,52,98,0.06)" },
  forecastHeader: { display: "flex", justifyContent: "space-between", marginBottom: 8 },
  forecastCycleLabel: { fontFamily: "'Fredoka', sans-serif", fontWeight: 600, fontSize: 13.5, color: "#E63462" },
  forecastUncertainty: { fontSize: 11, color: "#B892A8" },
  forecastRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#4A3448", padding: "3px 0" },
  overlay: { position: "fixed", inset: 0, background: "rgba(61,31,61,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: 20 },
  fullIntro: {
    position: "fixed", inset: 0, zIndex: 60, overflow: "hidden",
    background: "radial-gradient(circle at 30% 15%, #FFE3EE 0%, #FFF6EF 45%, #FFEFE0 100%)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    textAlign: "center", padding: "20px 28px",
  },
  modal: { background: "#fff", borderRadius: "24px 24px 0 0", padding: 26, width: "100%", maxWidth: 460, maxHeight: "85vh", overflowY: "auto" },
  modalTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 19, margin: "0 0 4px" },
  formLabel: { display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 700, color: "#8A6A80", marginBottom: 14 },
  input: { border: "1px solid #F0D8E0", borderRadius: 12, padding: "10px 12px", fontSize: 14, color: "#3D1F3D", width: "100%" },
  errorText: { color: "#E63462", fontSize: 13, marginTop: -6, marginBottom: 8 },
  personalizedTag: { fontSize: 10, fontWeight: 700, color: "#B892A8", marginLeft: 8, textTransform: "none" },
  personalizingNote: { fontSize: 12, color: "#B892A8", fontStyle: "italic", marginBottom: 10 },
  issueChip: { border: "1px solid #F0D8E0", background: "#fff", color: "#8A6A80", borderRadius: 999, padding: "7px 13px", fontSize: 12.5, fontWeight: 700, margin: "0 6px 6px 0" },
  issueChipActive: { background: "#FF6B9D", color: "#fff", border: "1px solid #FF6B9D" },
  fab: { position: "fixed", bottom: 22, right: 20, width: 60, height: 60, borderRadius: "50%", background: "#fff", border: "none", boxShadow: "0 6px 20px rgba(230,52,98,0.3)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 },
  chatModal: { background: "#fff", borderRadius: 24, width: "100%", maxWidth: 420, height: "70vh", display: "flex", flexDirection: "column", overflow: "hidden" },
  chatHeader: { display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #FBEAF0" },
  chatTitle: { fontFamily: "'Fredoka', sans-serif", fontSize: 16, fontWeight: 600 },
  chatSub: { fontSize: 11.5, color: "#B892A8" },
  closeBtn: { background: "transparent", border: "none", color: "#B892A8", fontSize: 16, fontWeight: 700 },
  chatBody: { flex: 1, overflowY: "auto", padding: "16px 18px", display: "flex", flexDirection: "column", gap: 10 },
  chatBubbleAssistant: { alignSelf: "flex-start", background: "#FFF1F6", color: "#4A3448", padding: "10px 14px", borderRadius: "14px 14px 14px 4px", fontSize: 13.5, lineHeight: 1.5, maxWidth: "85%" },
  chatBubbleUser: { alignSelf: "flex-end", background: "#FF6B9D", color: "#fff", padding: "10px 14px", borderRadius: "14px 14px 4px 14px", fontSize: 13.5, lineHeight: 1.5, maxWidth: "85%" },
  chatInputRow: { display: "flex", gap: 8, padding: 14, borderTop: "1px solid #FBEAF0" },
  chatInput: { flex: 1, border: "1px solid #F0D8E0", borderRadius: 999, padding: "10px 16px", fontSize: 14, color: "#3D1F3D" },
  chatSendBtn: { background: "#FF6B9D", color: "#fff", border: "none", borderRadius: "50%", width: 42, height: 42, fontSize: 16 },
};
