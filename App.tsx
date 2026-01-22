import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Image,
  Animated,
  Modal,
  Vibration,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width } = Dimensions.get('window');

// Types
type Screen = 'home' | 'profiles' | 'maths' | 'english' | 'science' | 'activities' | 'parent' | 'calm' | 'shop' | 'stats';
type AgeGroup = '5-6' | '7-8' | '9-10' | '11-12';
type Difficulty = 'easy' | 'medium' | 'hard';
type MathsOperation = 'addition' | 'subtraction' | 'multiplication' | 'division' | 'mixed';
type EnglishType = 'spelling' | 'phonics' | 'vocabulary' | 'grammar';
type ScienceType = 'animals' | 'plants' | 'body' | 'space' | 'materials';

interface ChildProfile {
  id: string;
  name: string;
  age: number;
  ageGroup: AgeGroup;
  avatarType: AvatarType;
  coins: number;
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  evolutionStage: number; // 1-5
  mathsStats: { correct: number; total: number; bestStreak: number };
  englishStats: { correct: number; total: number; bestStreak: number };
  scienceStats: { correct: number; total: number; bestStreak: number };
  offScreenMinutes: number;
  achievements: string[];
  moodLog: { date: string; mood: string }[];
  lastMoodCheck: string;
}

interface MoodEntry {
  date: string;
  mood: string;
  note?: string;
}

interface Activity {
  id: string;
  name: string;
  icon: string;
  minutes: number;
  coins: number;
  verified: boolean;
  date: string;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

// Age-appropriate content configuration
const AGE_CONFIG: Record<AgeGroup, {
  mathsRange: { min: number; max: number };
  operations: MathsOperation[];
  spellingWords: string[];
  scienceTopics: string[];
}> = {
  '5-6': {
    mathsRange: { min: 1, max: 10 },
    operations: ['addition', 'subtraction'],
    spellingWords: ['cat', 'dog', 'sun', 'mum', 'dad', 'red', 'big', 'run', 'the', 'and', 'is', 'it', 'can', 'on', 'at'],
    scienceTopics: ['animals', 'plants'],
  },
  '7-8': {
    mathsRange: { min: 1, max: 50 },
    operations: ['addition', 'subtraction', 'multiplication'],
    spellingWords: ['because', 'friend', 'school', 'house', 'people', 'water', 'about', 'would', 'their', 'could', 'there', 'every', 'different', 'through', 'thought'],
    scienceTopics: ['animals', 'plants', 'materials'],
  },
  '9-10': {
    mathsRange: { min: 1, max: 100 },
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
    spellingWords: ['necessary', 'separate', 'definitely', 'temperature', 'environment', 'government', 'immediately', 'interesting', 'particular', 'experience', 'knowledge', 'beautiful', 'favourite', 'important', 'remember'],
    scienceTopics: ['animals', 'body', 'materials', 'space'],
  },
  '11-12': {
    mathsRange: { min: 1, max: 1000 },
    operations: ['addition', 'subtraction', 'multiplication', 'division', 'mixed'],
    spellingWords: ['accommodate', 'conscience', 'exaggerate', 'guarantee', 'independent', 'maintenance', 'occurrence', 'persistence', 'questionnaire', 'recommendation', 'surveillance', 'thorough', 'unnecessary', 'withdrawal', 'acknowledgement'],
    scienceTopics: ['body', 'space', 'materials', 'plants'],
  },
};

// Avatar types with evolution stages
const AVATAR_TYPES = {
  dino: {
    name: 'Dino',
    stages: [
      { name: 'Egg', emoji: '🥚' },
      { name: 'Baby Dino', emoji: '🐣' },
      { name: 'Young Dino', emoji: '🦕' },
      { name: 'Teen Dino', emoji: '🦖' },
      { name: 'Super Dino', emoji: '👑🦖' },
    ],
  },
  dragon: {
    name: 'Dragon',
    stages: [
      { name: 'Egg', emoji: '🥚' },
      { name: 'Spark', emoji: '✨' },
      { name: 'Baby Dragon', emoji: '🐉' },
      { name: 'Fire Dragon', emoji: '🔥🐉' },
      { name: 'Legendary Dragon', emoji: '👑🐉' },
    ],
  },
  robot: {
    name: 'Robot',
    stages: [
      { name: 'Blueprint', emoji: '📋' },
      { name: 'Parts', emoji: '⚙️' },
      { name: 'Basic Bot', emoji: '🤖' },
      { name: 'Smart Bot', emoji: '🦾🤖' },
      { name: 'Super Bot', emoji: '👑🤖' },
    ],
  },
  alien: {
    name: 'Alien',
    stages: [
      { name: 'Signal', emoji: '📡' },
      { name: 'UFO', emoji: '🛸' },
      { name: 'Baby Alien', emoji: '👽' },
      { name: 'Space Explorer', emoji: '🚀👽' },
      { name: 'Galaxy Master', emoji: '👑👽' },
    ],
  },
  pirate: {
    name: 'Pirate',
    stages: [
      { name: 'Map', emoji: '🗺️' },
      { name: 'Sailor', emoji: '⛵' },
      { name: 'Deck Hand', emoji: '🏴‍☠️' },
      { name: 'Captain', emoji: '🦜🏴‍☠️' },
      { name: 'Pirate Legend', emoji: '👑🏴‍☠️' },
    ],
  },
};

type AvatarType = keyof typeof AVATAR_TYPES;

// XP needed for each stage
const STAGE_XP = [0, 100, 500, 1500, 5000];

// Mood options for check-in
const MOODS = [
  { emoji: '😊', label: 'Great', color: '#7CB342' },
  { emoji: '🙂', label: 'Good', color: '#8BC34A' },
  { emoji: '😐', label: 'Okay', color: '#FFC107' },
  { emoji: '😔', label: 'Sad', color: '#9E9E9E' },
  { emoji: '😤', label: 'Frustrated', color: '#FF7043' },
  { emoji: '😰', label: 'Worried', color: '#7986CB' },
  { emoji: '😴', label: 'Tired', color: '#90A4AE' },
];

// Achievements
const ACHIEVEMENTS = [
  { id: 'first_answer', name: 'First Steps', icon: '👣', description: 'Answer your first question' },
  { id: 'streak_3', name: 'On a Roll', icon: '🔥', description: '3 correct in a row' },
  { id: 'streak_10', name: 'Unstoppable', icon: '⚡', description: '10 correct in a row' },
  { id: 'maths_master', name: 'Maths Star', icon: '🧮', description: '50 maths questions correct' },
  { id: 'word_wizard', name: 'Word Wizard', icon: '📚', description: '50 English questions correct' },
  { id: 'science_explorer', name: 'Science Explorer', icon: '🔬', description: '50 science questions correct' },
  { id: 'outdoor_hero', name: 'Outdoor Hero', icon: '🌳', description: '60 minutes of outdoor play' },
  { id: 'first_evolution', name: 'Evolved!', icon: '🌟', description: 'Evolve your character for the first time' },
  { id: 'level_5', name: 'Rising Star', icon: '⭐', description: 'Reach level 5' },
  { id: 'level_10', name: 'Champion', icon: '🏆', description: 'Reach level 10' },
];

// Off-screen activities
const ACTIVITY_TYPES = [
  { id: 'outdoor', name: 'Played Outside', icon: '🌳', coinsPerMin: 2 },
  { id: 'reading', name: 'Read a Book', icon: '📖', coinsPerMin: 2 },
  { id: 'creative', name: 'Arts & Crafts', icon: '🎨', coinsPerMin: 1.5 },
  { id: 'helping', name: 'Helped at Home', icon: '🏠', coinsPerMin: 1.5 },
  { id: 'exercise', name: 'Exercise/Sport', icon: '⚽', coinsPerMin: 2 },
  { id: 'social', name: 'Played with Friends', icon: '👫', coinsPerMin: 1.5 },
];

// Calm colors for ASD/ADHD friendly design
const COLORS = {
  background: '#F8F9FA',
  card: '#FFFFFF',
  primary: '#6C63FF',
  secondary: '#4ECDC4',
  accent: '#FFE66D',
  success: '#7CB342',
  warning: '#FFA726',
  error: '#EF5350',
  text: '#2D3436',
  textLight: '#636E72',
  border: '#E0E0E0',
  maths: '#FF6B6B',
  english: '#4ECDC4',
  science: '#A29BFE',
  activities: '#FFEAA7',
};

// Default profile
const createDefaultProfile = (name: string, age: number, avatarType: AvatarType = 'dino'): ChildProfile => {
  const ageGroup: AgeGroup = age <= 6 ? '5-6' : age <= 8 ? '7-8' : age <= 10 ? '9-10' : '11-12';
  return {
    id: Date.now().toString(),
    name,
    age,
    ageGroup,
    avatarType,
    coins: 0,
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    evolutionStage: 1,
    mathsStats: { correct: 0, total: 0, bestStreak: 0 },
    englishStats: { correct: 0, total: 0, bestStreak: 0 },
    scienceStats: { correct: 0, total: 0, bestStreak: 0 },
    offScreenMinutes: 0,
    achievements: [],
    moodLog: [],
    lastMoodCheck: '',
  };
};

// Helper to get avatar emoji for current stage
const getAvatarEmoji = (profile: ChildProfile): string => {
  const avatarConfig = AVATAR_TYPES[profile.avatarType];
  const stageIndex = Math.min(profile.evolutionStage - 1, avatarConfig.stages.length - 1);
  return avatarConfig.stages[stageIndex]?.emoji || '🥚';
};

// Helper to get stage name
const getStageName = (profile: ChildProfile): string => {
  const avatarConfig = AVATAR_TYPES[profile.avatarType];
  const stageIndex = Math.min(profile.evolutionStage - 1, avatarConfig.stages.length - 1);
  return avatarConfig.stages[stageIndex]?.name || 'Egg';
};

export default function App() {
  // Core state
  const [screen, setScreen] = useState<Screen>('profiles');
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<ChildProfile | null>(null);
  const [isParentMode, setIsParentMode] = useState(false);

  // Profile creation
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarType>('dino');

  // Mood check-in
  const [showMoodCheck, setShowMoodCheck] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [moodNote, setMoodNote] = useState('');

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  // Activity state
  const [pendingActivities, setPendingActivities] = useState<Activity[]>([]);
  const [selectedActivityType, setSelectedActivityType] = useState<string | null>(null);
  const [activityMinutes, setActivityMinutes] = useState('');

  // UI state
  const [showAchievement, setShowAchievement] = useState<string | null>(null);

  // Animations
  const bounceAnim = useRef(new Animated.Value(1)).current;
  const celebrateAnim = useRef(new Animated.Value(0)).current;

  // Load data on start
  useEffect(() => {
    loadProfiles();
    loadPendingActivities();
  }, []);

  // Gentle bounce animation for dino
  useEffect(() => {
    const bounce = Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, { toValue: 1.08, duration: 1500, useNativeDriver: true }),
        Animated.timing(bounceAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
      ])
    );
    bounce.start();
    return () => bounce.stop();
  }, []);

  // Data persistence
  const loadProfiles = async () => {
    try {
      const saved = await AsyncStorage.getItem('learnProfiles');
      if (saved) {
        const parsed = JSON.parse(saved);
        setProfiles(parsed);
      }
    } catch (e) {
      console.log('Error loading profiles:', e);
    }
  };

  const saveProfiles = async (newProfiles: ChildProfile[]) => {
    try {
      await AsyncStorage.setItem('learnProfiles', JSON.stringify(newProfiles));
      setProfiles(newProfiles);
    } catch (e) {
      console.log('Error saving profiles:', e);
    }
  };

  const loadPendingActivities = async () => {
    try {
      const saved = await AsyncStorage.getItem('pendingActivities');
      if (saved) setPendingActivities(JSON.parse(saved));
    } catch (e) {}
  };

  const savePendingActivities = async (activities: Activity[]) => {
    try {
      await AsyncStorage.setItem('pendingActivities', JSON.stringify(activities));
      setPendingActivities(activities);
    } catch (e) {}
  };

  // Profile management
  const createProfile = () => {
    if (!newName.trim() || !newAge.trim()) {
      Alert.alert('Oops!', 'Please enter a name and age');
      return;
    }
    const age = parseInt(newAge);
    if (isNaN(age) || age < 4 || age > 14) {
      Alert.alert('Oops!', 'Please enter an age between 4 and 14');
      return;
    }
    const profile = createDefaultProfile(newName.trim(), age, selectedAvatar);
    const updated = [...profiles, profile];
    saveProfiles(updated);
    setNewName('');
    setNewAge('');
    setSelectedAvatar('dino');
    setShowCreateProfile(false);
    selectProfile(profile);
    Vibration.vibrate(100);
  };

  const selectProfile = (profile: ChildProfile) => {
    // Check for daily streak
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    let updatedProfile = { ...profile };

    if (profile.lastActiveDate === yesterday) {
      updatedProfile.streak += 1;
    } else if (profile.lastActiveDate !== today) {
      updatedProfile.streak = 1;
    }
    updatedProfile.lastActiveDate = today;

    setCurrentProfile(updatedProfile);
    updateProfile(updatedProfile);
    setScreen('home');
  };

  const updateProfile = (profile: ChildProfile) => {
    const updated = profiles.map(p => p.id === profile.id ? profile : p);
    saveProfiles(updated);
    setCurrentProfile(profile);
  };

  const deleteProfile = (profileId: string) => {
    Alert.alert(
      'Delete Profile?',
      'This will remove all progress for this profile.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updated = profiles.filter(p => p.id !== profileId);
            saveProfiles(updated);
            if (currentProfile?.id === profileId) {
              setCurrentProfile(null);
              setScreen('profiles');
            }
          },
        },
      ]
    );
  };

  // XP and leveling
  const addXP = (amount: number) => {
    if (!currentProfile) return;

    const newXP = currentProfile.xp + amount;
    const newLevel = Math.floor(newXP / 100) + 1;

    // Calculate evolution stage based on XP thresholds
    let newEvolutionStage = 1;
    for (let i = STAGE_XP.length - 1; i >= 0; i--) {
      if (newXP >= STAGE_XP[i]) {
        newEvolutionStage = i + 1;
        break;
      }
    }

    const updated = {
      ...currentProfile,
      xp: newXP,
      level: newLevel,
      evolutionStage: Math.max(currentProfile.evolutionStage, newEvolutionStage),
    };

    // Check for achievements
    checkAchievements(updated);
    updateProfile(updated);
  };

  const addCoins = (amount: number) => {
    if (!currentProfile) return;
    const updated = { ...currentProfile, coins: currentProfile.coins + amount };
    updateProfile(updated);
  };

  const checkAchievements = (profile: ChildProfile) => {
    const newAchievements: string[] = [];

    if (profile.mathsStats.total === 1 && !profile.achievements.includes('first_answer')) {
      newAchievements.push('first_answer');
    }
    if (profile.mathsStats.bestStreak >= 3 && !profile.achievements.includes('streak_3')) {
      newAchievements.push('streak_3');
    }
    if (profile.mathsStats.bestStreak >= 10 && !profile.achievements.includes('streak_10')) {
      newAchievements.push('streak_10');
    }
    if (profile.mathsStats.correct >= 50 && !profile.achievements.includes('maths_master')) {
      newAchievements.push('maths_master');
    }
    if (profile.englishStats.correct >= 50 && !profile.achievements.includes('word_wizard')) {
      newAchievements.push('word_wizard');
    }
    if (profile.scienceStats.correct >= 50 && !profile.achievements.includes('science_explorer')) {
      newAchievements.push('science_explorer');
    }
    if (profile.offScreenMinutes >= 60 && !profile.achievements.includes('outdoor_hero')) {
      newAchievements.push('outdoor_hero');
    }
    if (profile.evolutionStage >= 2 && !profile.achievements.includes('first_evolution')) {
      newAchievements.push('first_evolution');
    }
    if (profile.level >= 5 && !profile.achievements.includes('level_5')) {
      newAchievements.push('level_5');
    }
    if (profile.level >= 10 && !profile.achievements.includes('level_10')) {
      newAchievements.push('level_10');
    }

    if (newAchievements.length > 0) {
      profile.achievements = [...profile.achievements, ...newAchievements];
      setShowAchievement(newAchievements[0]);
      Vibration.vibrate([100, 100, 100]);
      setTimeout(() => setShowAchievement(null), 3000);
    }
  };

  // Question generation
  const generateMathsQuestion = (): Question => {
    if (!currentProfile) return { question: '', options: [], correctIndex: 0 };

    const config = AGE_CONFIG[currentProfile.ageGroup];
    const { min, max } = config.mathsRange;
    const operations = config.operations;
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let a: number, b: number, answer: number, questionText: string;

    switch (operation) {
      case 'addition':
        a = Math.floor(Math.random() * (max - min + 1)) + min;
        b = Math.floor(Math.random() * (max - min + 1)) + min;
        answer = a + b;
        questionText = `${a} + ${b} = ?`;
        break;
      case 'subtraction':
        a = Math.floor(Math.random() * (max - min + 1)) + min;
        b = Math.floor(Math.random() * Math.min(a, max - min + 1)) + min;
        if (b > a) [a, b] = [b, a]; // Ensure positive result for younger kids
        answer = a - b;
        questionText = `${a} - ${b} = ?`;
        break;
      case 'multiplication':
        a = Math.floor(Math.random() * 12) + 1;
        b = Math.floor(Math.random() * 12) + 1;
        answer = a * b;
        questionText = `${a} × ${b} = ?`;
        break;
      case 'division':
        b = Math.floor(Math.random() * 12) + 1;
        answer = Math.floor(Math.random() * 12) + 1;
        a = b * answer; // Ensure clean division
        questionText = `${a} ÷ ${b} = ?`;
        break;
      default:
        a = Math.floor(Math.random() * (max - min + 1)) + min;
        b = Math.floor(Math.random() * (max - min + 1)) + min;
        answer = a + b;
        questionText = `${a} + ${b} = ?`;
    }

    // Generate wrong options
    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 10) - 5);
      if (wrong !== answer && wrong >= 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }

    // Shuffle options
    const shuffled = options.sort(() => Math.random() - 0.5);
    const correctIndex = shuffled.indexOf(answer);

    return {
      question: questionText,
      options: shuffled.map(String),
      correctIndex,
    };
  };

  const generateEnglishQuestion = (): Question => {
    if (!currentProfile) return { question: '', options: [], correctIndex: 0 };

    const config = AGE_CONFIG[currentProfile.ageGroup];
    const words = config.spellingWords;
    const word = words[Math.floor(Math.random() * words.length)];

    // Create a misspelled version
    const misspellings: string[] = [];

    // Common misspelling patterns
    const patterns = [
      (w: string) => w.replace(/([aeiou])/i, (match) => match === match.toLowerCase() ? match.toUpperCase() : match.toLowerCase()).toLowerCase(),
      (w: string) => w.slice(0, -1) + w.slice(-1).repeat(2),
      (w: string) => w.slice(0, 1) + w.slice(2, 3) + w.slice(1, 2) + w.slice(3),
      (w: string) => w.replace('e', 'a'),
      (w: string) => w.replace('i', 'e'),
      (w: string) => w + 'e',
    ];

    while (misspellings.length < 3) {
      const pattern = patterns[Math.floor(Math.random() * patterns.length)];
      const misspelled = pattern(word);
      if (misspelled !== word && !misspellings.includes(misspelled)) {
        misspellings.push(misspelled);
      }
    }

    const options = [word, ...misspellings];
    const shuffled = options.sort(() => Math.random() - 0.5);

    return {
      question: `Which spelling is correct?`,
      options: shuffled,
      correctIndex: shuffled.indexOf(word),
      explanation: `The correct spelling is "${word}"`,
    };
  };

  const generateScienceQuestion = (): Question => {
    if (!currentProfile) return { question: '', options: [], correctIndex: 0 };

    // Science questions by topic
    const scienceQuestions: Record<string, Question[]> = {
      animals: [
        { question: 'What do herbivores eat?', options: ['Plants', 'Meat', 'Fish', 'Insects'], correctIndex: 0, explanation: 'Herbivores only eat plants!' },
        { question: 'How many legs does a spider have?', options: ['8', '6', '4', '10'], correctIndex: 0, explanation: 'Spiders have 8 legs. Insects have 6!' },
        { question: 'What is a baby frog called?', options: ['Tadpole', 'Cub', 'Chick', 'Puppy'], correctIndex: 0 },
        { question: 'Which animal is a mammal?', options: ['Dolphin', 'Shark', 'Salmon', 'Octopus'], correctIndex: 0, explanation: 'Dolphins are mammals - they breathe air and feed milk to their babies!' },
        { question: 'What do bees make?', options: ['Honey', 'Milk', 'Silk', 'Wool'], correctIndex: 0 },
      ],
      plants: [
        { question: 'What do plants need to grow?', options: ['Water, light & air', 'Just water', 'Just light', 'Just soil'], correctIndex: 0 },
        { question: 'What part of the plant makes food?', options: ['Leaves', 'Roots', 'Stem', 'Flower'], correctIndex: 0, explanation: 'Leaves use sunlight to make food through photosynthesis!' },
        { question: 'What do roots do?', options: ['Absorb water', 'Make seeds', 'Attract bees', 'Store light'], correctIndex: 0 },
        { question: 'What is the process plants use to make food?', options: ['Photosynthesis', 'Digestion', 'Respiration', 'Evaporation'], correctIndex: 0 },
      ],
      body: [
        { question: 'What organ pumps blood around your body?', options: ['Heart', 'Brain', 'Lungs', 'Stomach'], correctIndex: 0 },
        { question: 'How many bones does an adult have?', options: ['206', '100', '50', '500'], correctIndex: 0 },
        { question: 'What do your lungs do?', options: ['Help you breathe', 'Digest food', 'Pump blood', 'Think'], correctIndex: 0 },
        { question: 'Which body part controls your whole body?', options: ['Brain', 'Heart', 'Stomach', 'Muscles'], correctIndex: 0 },
        { question: 'What are your five senses?', options: ['Sight, hearing, touch, taste, smell', 'Running, jumping, walking, sitting, standing', 'Happy, sad, angry, scared, excited', 'Red, blue, green, yellow, orange'], correctIndex: 0 },
      ],
      space: [
        { question: 'What is the closest star to Earth?', options: ['The Sun', 'The Moon', 'Mars', 'Polaris'], correctIndex: 0 },
        { question: 'How many planets are in our solar system?', options: ['8', '9', '7', '10'], correctIndex: 0, explanation: 'There are 8 planets. Pluto is now called a dwarf planet!' },
        { question: 'What planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correctIndex: 0 },
        { question: 'What is the largest planet?', options: ['Jupiter', 'Saturn', 'Earth', 'Neptune'], correctIndex: 0 },
        { question: 'The Moon orbits around...', options: ['Earth', 'The Sun', 'Mars', 'Jupiter'], correctIndex: 0 },
      ],
      materials: [
        { question: 'Which material is magnetic?', options: ['Iron', 'Wood', 'Plastic', 'Glass'], correctIndex: 0 },
        { question: 'What happens to water when it freezes?', options: ['It becomes ice', 'It evaporates', 'It disappears', 'It becomes gas'], correctIndex: 0 },
        { question: 'Which material is transparent?', options: ['Glass', 'Wood', 'Metal', 'Cardboard'], correctIndex: 0, explanation: 'Transparent means you can see through it!' },
        { question: 'What is ice made of?', options: ['Frozen water', 'Frozen milk', 'Frozen air', 'Frozen sand'], correctIndex: 0 },
      ],
    };

    const config = AGE_CONFIG[currentProfile.ageGroup];
    const topic = config.scienceTopics[Math.floor(Math.random() * config.scienceTopics.length)];
    const questions = scienceQuestions[topic] || scienceQuestions.animals;
    const question = questions[Math.floor(Math.random() * questions.length)];

    // Shuffle options while tracking correct answer
    const correctAnswer = question.options[question.correctIndex];
    const shuffled = [...question.options].sort(() => Math.random() - 0.5);

    return {
      ...question,
      options: shuffled,
      correctIndex: shuffled.indexOf(correctAnswer),
    };
  };

  const startQuestion = (type: 'maths' | 'english' | 'science') => {
    let question: Question;

    switch (type) {
      case 'maths':
        question = generateMathsQuestion();
        break;
      case 'english':
        question = generateEnglishQuestion();
        break;
      case 'science':
        question = generateScienceQuestion();
        break;
    }

    setCurrentQuestion(question);
    setSelectedAnswer(null);
    setIsAnswered(false);
    setShowExplanation(false);
  };

  const answerQuestion = (index: number, subject: 'maths' | 'english' | 'science') => {
    if (isAnswered || !currentQuestion || !currentProfile) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      // Correct answer
      Vibration.vibrate(100);
      setSessionCorrect(prev => prev + 1);
      setCurrentStreak(prev => prev + 1);
      addXP(10);
      addCoins(5);

      // Celebrate animation
      Animated.sequence([
        Animated.timing(celebrateAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(celebrateAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      // Wrong answer
      Vibration.vibrate([50, 50, 50]);
      setCurrentStreak(0);
      setShowExplanation(true);
    }

    setSessionTotal(prev => prev + 1);

    // Update stats
    const statsKey = `${subject}Stats` as 'mathsStats' | 'englishStats' | 'scienceStats';
    const updated = {
      ...currentProfile,
      [statsKey]: {
        correct: currentProfile[statsKey].correct + (isCorrect ? 1 : 0),
        total: currentProfile[statsKey].total + 1,
        bestStreak: Math.max(currentProfile[statsKey].bestStreak, isCorrect ? currentStreak + 1 : 0),
      },
    };
    updateProfile(updated);
  };

  // Activity management
  const submitActivity = () => {
    if (!selectedActivityType || !activityMinutes || !currentProfile) return;

    const minutes = parseInt(activityMinutes);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert('Oops!', 'Please enter valid minutes');
      return;
    }

    const activityType = ACTIVITY_TYPES.find(a => a.id === selectedActivityType);
    if (!activityType) return;

    const activity: Activity = {
      id: Date.now().toString(),
      name: activityType.name,
      icon: activityType.icon,
      minutes,
      coins: Math.round(minutes * activityType.coinsPerMin),
      verified: false,
      date: new Date().toISOString(),
    };

    const updated = [...pendingActivities, activity];
    savePendingActivities(updated);

    setSelectedActivityType(null);
    setActivityMinutes('');

    Alert.alert(
      'Activity Logged!',
      `Ask a grown-up to verify "${activityType.name}" to earn ${activity.coins} coins!`,
      [{ text: 'OK' }]
    );
  };

  const verifyActivity = (activityId: string) => {
    const activity = pendingActivities.find(a => a.id === activityId);
    if (!activity || !currentProfile) return;

    // Add coins and update off-screen minutes
    const updated = {
      ...currentProfile,
      coins: currentProfile.coins + activity.coins,
      offScreenMinutes: currentProfile.offScreenMinutes + activity.minutes,
    };
    updateProfile(updated);

    // Remove from pending
    const remaining = pendingActivities.filter(a => a.id !== activityId);
    savePendingActivities(remaining);

    Vibration.vibrate(100);
  };

  const rejectActivity = (activityId: string) => {
    const remaining = pendingActivities.filter(a => a.id !== activityId);
    savePendingActivities(remaining);
  };

  // Navigation helpers
  const goHome = () => {
    setScreen('home');
    setCurrentQuestion(null);
    setSessionCorrect(0);
    setSessionTotal(0);
    setCurrentStreak(0);
  };

  // Render functions
  const renderProfileSelect = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Who's Learning Today?</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.profilesContainer}>
        {profiles.map(profile => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => selectProfile(profile)}
            onLongPress={() => deleteProfile(profile.id)}
          >
            <Text style={styles.profileAvatar}>
              {getAvatarEmoji(profile)}
            </Text>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileAge}>Age {profile.age}</Text>
            <View style={styles.profileStats}>
              <Text style={styles.profileStatText}>⭐ Level {profile.level}</Text>
              <Text style={styles.profileStatText}>🔥 {profile.streak} day streak</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.profileCard, styles.addProfileCard]}
          onPress={() => setShowCreateProfile(true)}
        >
          <Text style={styles.addProfileIcon}>➕</Text>
          <Text style={styles.addProfileText}>Add Player</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Profile Modal */}
      <Modal visible={showCreateProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Player</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              value={newName}
              onChangeText={setNewName}
              autoCapitalize="words"
            />

            <TextInput
              style={styles.input}
              placeholder="Age (4-14)"
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="number-pad"
              maxLength={2}
            />

            <Text style={styles.avatarSelectLabel}>Choose your character:</Text>
            <View style={styles.avatarSelectRow}>
              {(Object.keys(AVATAR_TYPES) as AvatarType[]).map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.avatarOption,
                    selectedAvatar === type && styles.avatarOptionSelected,
                  ]}
                  onPress={() => setSelectedAvatar(type)}
                >
                  <Text style={styles.avatarOptionEmoji}>
                    {AVATAR_TYPES[type].stages[2]?.emoji || '🥚'}
                  </Text>
                  <Text style={styles.avatarOptionName}>{AVATAR_TYPES[type].name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => {
                  setShowCreateProfile(false);
                  setNewName('');
                  setNewAge('');
                  setSelectedAvatar('dino');
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={createProfile}
              >
                <Text style={styles.confirmButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  const renderHome = () => {
    if (!currentProfile) return null;

    const avatarEmoji = getAvatarEmoji(currentProfile);
    const stageName = getStageName(currentProfile);
    const nextStageXP = STAGE_XP[currentProfile.evolutionStage] || STAGE_XP[STAGE_XP.length - 1];
    const xpToNext = Math.max(0, nextStageXP - currentProfile.xp);

    return (
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setScreen('profiles')}>
            <Text style={styles.backText}>← Switch</Text>
          </TouchableOpacity>
          <View style={styles.statsRow}>
            <Text style={styles.statBadge}>🪙 {currentProfile.coins}</Text>
            <Text style={styles.statBadge}>⭐ {currentProfile.xp} XP</Text>
            <Text style={styles.statBadge}>🔥 {currentProfile.streak}</Text>
          </View>
        </View>

        {/* Avatar & Greeting */}
        <View style={styles.avatarSection}>
          <Animated.Text style={[styles.bigAvatar, { transform: [{ scale: bounceAnim }] }]}>
            {avatarEmoji}
          </Animated.Text>
          <Text style={styles.greeting}>Hey {currentProfile.name}!</Text>
          <Text style={styles.avatarStatus}>
            {stageName} • Level {currentProfile.level}
          </Text>
          {xpToNext > 0 && currentProfile.evolutionStage < 5 && (
            <Text style={styles.xpToNext}>{xpToNext} XP to evolve!</Text>
          )}
        </View>

        {/* Subject Buttons */}
        <View style={styles.subjectsGrid}>
          <TouchableOpacity
            style={[styles.subjectCard, { backgroundColor: COLORS.maths }]}
            onPress={() => { setScreen('maths'); startQuestion('maths'); }}
          >
            <Text style={styles.subjectIcon}>🧮</Text>
            <Text style={styles.subjectName}>Maths</Text>
            <Text style={styles.subjectProgress}>
              {currentProfile.mathsStats.correct} correct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subjectCard, { backgroundColor: COLORS.english }]}
            onPress={() => { setScreen('english'); startQuestion('english'); }}
          >
            <Text style={styles.subjectIcon}>📚</Text>
            <Text style={styles.subjectName}>English</Text>
            <Text style={styles.subjectProgress}>
              {currentProfile.englishStats.correct} correct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subjectCard, { backgroundColor: COLORS.science }]}
            onPress={() => { setScreen('science'); startQuestion('science'); }}
          >
            <Text style={styles.subjectIcon}>🔬</Text>
            <Text style={styles.subjectName}>Science</Text>
            <Text style={styles.subjectProgress}>
              {currentProfile.scienceStats.correct} correct
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.subjectCard, { backgroundColor: COLORS.activities }]}
            onPress={() => setScreen('activities')}
          >
            <Text style={styles.subjectIcon}>🌳</Text>
            <Text style={styles.subjectName}>Activities</Text>
            <Text style={styles.subjectProgress}>
              {currentProfile.offScreenMinutes} mins earned
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bottom Buttons */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setScreen('calm')}
          >
            <Text style={styles.bottomButtonIcon}>🌈</Text>
            <Text style={styles.bottomButtonText}>Calm</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setScreen('stats')}
          >
            <Text style={styles.bottomButtonIcon}>📊</Text>
            <Text style={styles.bottomButtonText}>Stats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => setIsParentMode(true)}
          >
            <Text style={styles.bottomButtonIcon}>👨‍👩‍👧</Text>
            <Text style={styles.bottomButtonText}>Parent</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  };

  const renderQuiz = (subject: 'maths' | 'english' | 'science') => {
    if (!currentQuestion || !currentProfile) return null;

    const subjectColors = {
      maths: COLORS.maths,
      english: COLORS.english,
      science: COLORS.science,
    };

    const subjectNames = {
      maths: 'Maths',
      english: 'English',
      science: 'Science',
    };

    return (
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={goHome}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={[styles.quizSubject, { color: subjectColors[subject] }]}>
            {subjectNames[subject]}
          </Text>
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {currentStreak}</Text>
          </View>
        </View>

        {/* Session Stats */}
        <View style={styles.sessionStats}>
          <Text style={styles.sessionStatText}>
            ✓ {sessionCorrect} / {sessionTotal}
          </Text>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {currentQuestion.options.map((option, index) => {
            let optionStyle = styles.optionButton;
            let textStyle = styles.optionText;

            if (isAnswered) {
              if (index === currentQuestion.correctIndex) {
                optionStyle = { ...styles.optionButton, ...styles.correctOption };
                textStyle = { ...styles.optionText, ...styles.correctOptionText };
              } else if (index === selectedAnswer) {
                optionStyle = { ...styles.optionButton, ...styles.wrongOption };
                textStyle = { ...styles.optionText, ...styles.wrongOptionText };
              }
            }

            return (
              <TouchableOpacity
                key={index}
                style={optionStyle}
                onPress={() => answerQuestion(index, subject)}
                disabled={isAnswered}
              >
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Explanation */}
        {showExplanation && currentQuestion.explanation && (
          <View style={styles.explanationBox}>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}

        {/* Next Button */}
        {isAnswered && (
          <TouchableOpacity
            style={[styles.nextButton, { backgroundColor: subjectColors[subject] }]}
            onPress={() => startQuestion(subject)}
          >
            <Text style={styles.nextButtonText}>Next Question →</Text>
          </TouchableOpacity>
        )}

        {/* Celebrate Animation */}
        <Animated.View
          style={[
            styles.celebrateOverlay,
            { opacity: celebrateAnim },
          ]}
          pointerEvents="none"
        >
          <Text style={styles.celebrateText}>⭐ Great Job! ⭐</Text>
        </Animated.View>
      </SafeAreaView>
    );
  };

  const renderActivities = () => {
    if (!currentProfile) return null;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goHome}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Off-Screen Activities</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Log an Activity</Text>
          <Text style={styles.sectionSubtitle}>
            Earn coins for playing offline! A grown-up needs to verify.
          </Text>

          <View style={styles.activityTypes}>
            {ACTIVITY_TYPES.map(activity => (
              <TouchableOpacity
                key={activity.id}
                style={[
                  styles.activityType,
                  selectedActivityType === activity.id && styles.activityTypeSelected,
                ]}
                onPress={() => setSelectedActivityType(activity.id)}
              >
                <Text style={styles.activityTypeIcon}>{activity.icon}</Text>
                <Text style={styles.activityTypeName}>{activity.name}</Text>
                <Text style={styles.activityTypeCoins}>
                  {activity.coinsPerMin} coins/min
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {selectedActivityType && (
            <View style={styles.activityForm}>
              <Text style={styles.activityFormLabel}>How many minutes?</Text>
              <TextInput
                style={styles.minutesInput}
                value={activityMinutes}
                onChangeText={setActivityMinutes}
                keyboardType="number-pad"
                placeholder="30"
                maxLength={3}
              />
              <TouchableOpacity
                style={styles.submitActivityButton}
                onPress={submitActivity}
              >
                <Text style={styles.submitActivityText}>Log Activity</Text>
              </TouchableOpacity>
            </View>
          )}

          {pendingActivities.length > 0 && (
            <View style={styles.pendingSection}>
              <Text style={styles.sectionTitle}>Waiting for Verification</Text>
              {pendingActivities.map(activity => (
                <View key={activity.id} style={styles.pendingActivity}>
                  <Text style={styles.pendingIcon}>{activity.icon}</Text>
                  <View style={styles.pendingInfo}>
                    <Text style={styles.pendingName}>{activity.name}</Text>
                    <Text style={styles.pendingDetails}>
                      {activity.minutes} mins • {activity.coins} coins
                    </Text>
                  </View>
                  <Text style={styles.pendingStatus}>⏳</Text>
                </View>
              ))}
              <Text style={styles.pendingHint}>
                Ask a grown-up to verify in Parent Mode!
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderCalm = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={goHome}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Calm Corner</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.calmContent}>
        <Text style={styles.calmTitle}>Need a break?</Text>
        <Text style={styles.calmSubtitle}>That's okay. Try one of these:</Text>

        <TouchableOpacity style={styles.calmCard}>
          <Text style={styles.calmCardIcon}>🌬️</Text>
          <View style={styles.calmCardText}>
            <Text style={styles.calmCardTitle}>Deep Breaths</Text>
            <Text style={styles.calmCardDesc}>Breathe in for 4, hold for 4, out for 4</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.calmCard}>
          <Text style={styles.calmCardIcon}>🖐️</Text>
          <View style={styles.calmCardText}>
            <Text style={styles.calmCardTitle}>5-4-3-2-1</Text>
            <Text style={styles.calmCardDesc}>5 things you see, 4 you hear, 3 you feel...</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.calmCard}>
          <Text style={styles.calmCardIcon}>💪</Text>
          <View style={styles.calmCardText}>
            <Text style={styles.calmCardTitle}>Squeeze & Release</Text>
            <Text style={styles.calmCardDesc}>Squeeze your hands tight, then let go</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.calmReminder}>
          <Text style={styles.calmReminderText}>
            It's okay to take breaks. Learning is easier when you feel calm. 💜
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  const renderStats = () => {
    if (!currentProfile) return null;

    const achievements = ACHIEVEMENTS.filter(a =>
      currentProfile.achievements.includes(a.id)
    );
    const lockedAchievements = ACHIEVEMENTS.filter(a =>
      !currentProfile.achievements.includes(a.id)
    );

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={goHome}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Progress</Text>
          <View style={{ width: 50 }} />
        </View>

        <ScrollView style={styles.content}>
          {/* Overview */}
          <View style={styles.statsOverview}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentProfile.level}</Text>
              <Text style={styles.statLabel}>Level</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentProfile.xp}</Text>
              <Text style={styles.statLabel}>Total XP</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentProfile.coins}</Text>
              <Text style={styles.statLabel}>Coins</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{currentProfile.streak}</Text>
              <Text style={styles.statLabel}>Day Streak</Text>
            </View>
          </View>

          {/* Subject Stats */}
          <Text style={styles.sectionTitle}>Subject Progress</Text>

          <View style={styles.subjectStat}>
            <Text style={styles.subjectStatIcon}>🧮</Text>
            <View style={styles.subjectStatInfo}>
              <Text style={styles.subjectStatName}>Maths</Text>
              <Text style={styles.subjectStatDetails}>
                {currentProfile.mathsStats.correct} / {currentProfile.mathsStats.total} correct
                {currentProfile.mathsStats.total > 0 &&
                  ` (${Math.round(currentProfile.mathsStats.correct / currentProfile.mathsStats.total * 100)}%)`
                }
              </Text>
            </View>
          </View>

          <View style={styles.subjectStat}>
            <Text style={styles.subjectStatIcon}>📚</Text>
            <View style={styles.subjectStatInfo}>
              <Text style={styles.subjectStatName}>English</Text>
              <Text style={styles.subjectStatDetails}>
                {currentProfile.englishStats.correct} / {currentProfile.englishStats.total} correct
                {currentProfile.englishStats.total > 0 &&
                  ` (${Math.round(currentProfile.englishStats.correct / currentProfile.englishStats.total * 100)}%)`
                }
              </Text>
            </View>
          </View>

          <View style={styles.subjectStat}>
            <Text style={styles.subjectStatIcon}>🔬</Text>
            <View style={styles.subjectStatInfo}>
              <Text style={styles.subjectStatName}>Science</Text>
              <Text style={styles.subjectStatDetails}>
                {currentProfile.scienceStats.correct} / {currentProfile.scienceStats.total} correct
                {currentProfile.scienceStats.total > 0 &&
                  ` (${Math.round(currentProfile.scienceStats.correct / currentProfile.scienceStats.total * 100)}%)`
                }
              </Text>
            </View>
          </View>

          {/* Achievements */}
          <Text style={styles.sectionTitle}>Achievements</Text>

          <View style={styles.achievementsGrid}>
            {achievements.map(achievement => (
              <View key={achievement.id} style={styles.achievement}>
                <Text style={styles.achievementIcon}>{achievement.icon}</Text>
                <Text style={styles.achievementName}>{achievement.name}</Text>
              </View>
            ))}
            {lockedAchievements.map(achievement => (
              <View key={achievement.id} style={[styles.achievement, styles.achievementLocked]}>
                <Text style={styles.achievementIconLocked}>🔒</Text>
                <Text style={styles.achievementNameLocked}>{achievement.name}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderParentMode = () => {
    if (!isParentMode) return null;

    return (
      <Modal visible={isParentMode} animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsParentMode(false)}>
              <Text style={styles.backText}>← Done</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Parent Mode</Text>
            <View style={{ width: 50 }} />
          </View>

          <ScrollView style={styles.content}>
            {/* Pending Activities */}
            <Text style={styles.sectionTitle}>Activities to Verify</Text>

            {pendingActivities.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No activities waiting</Text>
              </View>
            ) : (
              pendingActivities.map(activity => (
                <View key={activity.id} style={styles.verifyCard}>
                  <View style={styles.verifyInfo}>
                    <Text style={styles.verifyIcon}>{activity.icon}</Text>
                    <View>
                      <Text style={styles.verifyName}>{activity.name}</Text>
                      <Text style={styles.verifyDetails}>
                        {activity.minutes} minutes • {activity.coins} coins
                      </Text>
                    </View>
                  </View>
                  <View style={styles.verifyButtons}>
                    <TouchableOpacity
                      style={styles.verifyYes}
                      onPress={() => verifyActivity(activity.id)}
                    >
                      <Text style={styles.verifyYesText}>✓ Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.verifyNo}
                      onPress={() => rejectActivity(activity.id)}
                    >
                      <Text style={styles.verifyNoText}>✗</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {/* Quick Stats */}
            {currentProfile && (
              <>
                <Text style={styles.sectionTitle}>{currentProfile.name}'s Summary</Text>
                <View style={styles.parentSummary}>
                  <Text style={styles.parentSummaryItem}>
                    📊 Level {currentProfile.level} ({currentProfile.xp} XP)
                  </Text>
                  <Text style={styles.parentSummaryItem}>
                    🧮 Maths: {currentProfile.mathsStats.correct} correct
                  </Text>
                  <Text style={styles.parentSummaryItem}>
                    📚 English: {currentProfile.englishStats.correct} correct
                  </Text>
                  <Text style={styles.parentSummaryItem}>
                    🔬 Science: {currentProfile.scienceStats.correct} correct
                  </Text>
                  <Text style={styles.parentSummaryItem}>
                    🌳 Off-screen: {currentProfile.offScreenMinutes} minutes
                  </Text>
                  <Text style={styles.parentSummaryItem}>
                    🔥 {currentProfile.streak} day streak
                  </Text>
                </View>
              </>
            )}

            <Text style={styles.parentTip}>
              Tip: Let your child log activities, then verify them here. This teaches them that off-screen play is valuable too!
            </Text>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderAchievementPopup = () => {
    if (!showAchievement) return null;

    const achievement = ACHIEVEMENTS.find(a => a.id === showAchievement);
    if (!achievement) return null;

    return (
      <View style={styles.achievementPopup}>
        <Text style={styles.achievementPopupIcon}>{achievement.icon}</Text>
        <Text style={styles.achievementPopupTitle}>Achievement Unlocked!</Text>
        <Text style={styles.achievementPopupName}>{achievement.name}</Text>
      </View>
    );
  };

  // Main render
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />

      {screen === 'profiles' && renderProfileSelect()}
      {screen === 'home' && renderHome()}
      {screen === 'maths' && renderQuiz('maths')}
      {screen === 'english' && renderQuiz('english')}
      {screen === 'science' && renderQuiz('science')}
      {screen === 'activities' && renderActivities()}
      {screen === 'calm' && renderCalm()}
      {screen === 'stats' && renderStats()}

      {renderParentMode()}
      {renderAchievementPopup()}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  backText: {
    fontSize: 16,
    color: COLORS.primary,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBadge: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },

  // Content
  content: {
    flex: 1,
    padding: 20,
  },

  // Profiles
  profilesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingVertical: 20,
  },
  profileCard: {
    width: width * 0.4,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  profileAvatar: {
    fontSize: 50,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  profileAge: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 8,
  },
  profileStats: {
    alignItems: 'center',
  },
  profileStatText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  addProfileCard: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  },
  addProfileIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  addProfileText: {
    fontSize: 16,
    color: COLORS.textLight,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 25,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    marginBottom: 15,
    backgroundColor: COLORS.background,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: COLORS.background,
  },
  cancelButtonText: {
    color: COLORS.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: COLORS.primary,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Dino section
  dinoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  bigDino: {
    fontSize: 80,
    marginBottom: 10,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
  },
  dinoStatus: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  xpToNext: {
    fontSize: 12,
    color: COLORS.primary,
    marginTop: 4,
  },

  // Subjects grid
  subjectsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    paddingHorizontal: 10,
  },
  subjectCard: {
    width: width * 0.42,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  subjectIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  subjectName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  subjectProgress: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },

  // Bottom buttons
  bottomButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.card,
  },
  bottomButton: {
    alignItems: 'center',
    padding: 10,
  },
  bottomButtonIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  bottomButtonText: {
    fontSize: 12,
    color: COLORS.textLight,
  },

  // Quiz
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: COLORS.card,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  quizSubject: {
    fontSize: 20,
    fontWeight: '700',
  },
  streakBadge: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionStats: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  sessionStatText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  questionContainer: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  questionText: {
    fontSize: 28,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  optionButton: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  optionText: {
    fontSize: 20,
    fontWeight: '500',
    color: COLORS.text,
  },
  correctOption: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  correctOptionText: {
    color: '#fff',
  },
  wrongOption: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },
  wrongOptionText: {
    color: '#fff',
  },
  explanationBox: {
    backgroundColor: '#FFF9E6',
    borderRadius: 12,
    padding: 15,
    margin: 20,
    marginTop: 10,
  },
  explanationText: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'center',
  },
  nextButton: {
    margin: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  celebrateOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  celebrateText: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.success,
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },

  // Activities
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
    marginTop: 15,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 15,
  },
  activityTypes: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  activityType: {
    width: (width - 60) / 2,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  activityTypeSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0EFFF',
  },
  activityTypeIcon: {
    fontSize: 30,
    marginBottom: 5,
  },
  activityTypeName: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  activityTypeCoins: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  activityForm: {
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.card,
    borderRadius: 15,
  },
  activityFormLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 10,
  },
  minutesInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 15,
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 15,
    backgroundColor: COLORS.background,
  },
  submitActivityButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
  },
  submitActivityText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  pendingSection: {
    marginTop: 25,
  },
  pendingActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  pendingIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  pendingInfo: {
    flex: 1,
  },
  pendingName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  pendingDetails: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  pendingStatus: {
    fontSize: 20,
  },
  pendingHint: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },

  // Calm
  calmContent: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  calmTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  calmSubtitle: {
    fontSize: 16,
    color: COLORS.textLight,
    marginBottom: 25,
  },
  calmCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  calmCardIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  calmCardText: {
    flex: 1,
  },
  calmCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  calmCardDesc: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  calmReminder: {
    backgroundColor: '#F0EFFF',
    borderRadius: 12,
    padding: 20,
    marginTop: 20,
  },
  calmReminderText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Stats
  statsOverview: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  subjectStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
  },
  subjectStatIcon: {
    fontSize: 28,
    marginRight: 15,
  },
  subjectStatInfo: {
    flex: 1,
  },
  subjectStatName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  subjectStatDetails: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  achievementsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 10,
  },
  achievement: {
    width: (width - 60) / 3,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  achievementLocked: {
    opacity: 0.5,
  },
  achievementIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  achievementIconLocked: {
    fontSize: 28,
    marginBottom: 4,
  },
  achievementName: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
  },
  achievementNameLocked: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'center',
  },

  // Parent mode
  verifyCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  verifyInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  verifyIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  verifyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifyDetails: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  verifyYes: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  verifyYesText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  verifyNo: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    padding: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  verifyNoText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 30,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  parentSummary: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  parentSummaryItem: {
    fontSize: 15,
    color: COLORS.text,
    paddingVertical: 6,
  },
  parentTip: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: 'center',
    marginTop: 25,
    fontStyle: 'italic',
    paddingHorizontal: 10,
  },

  // Achievement popup
  achievementPopup: {
    position: 'absolute',
    top: 100,
    left: 20,
    right: 20,
    backgroundColor: COLORS.accent,
    borderRadius: 15,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 1000,
  },
  achievementPopupIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  achievementPopupTitle: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  },
  achievementPopupName: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
});
