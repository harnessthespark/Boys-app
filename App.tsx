import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Animated,
  Modal,
  Vibration,
  TextInput,
  Alert,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';

const { width, height } = Dimensions.get('window');

// ============================================
// TYPES
// ============================================
type Screen = 'profiles' | 'planet' | 'missions' | 'mission-play' | 'build' | 'leaderboard' | 'parent';
type AgeGroup = '5-6' | '7-8' | '9-10' | '11-12';
type MissionType = 'maths' | 'english' | 'science';
type BiomeType = 'grass' | 'forest' | 'ocean' | 'volcano' | 'ice' | 'desert' | 'crystal' | 'space';
type StructureType = 'house' | 'tower' | 'tree' | 'rocket' | 'bridge' | 'dome' | 'mine' | 'lab';
type CreatureType = 'blob' | 'floater' | 'runner' | 'flyer' | 'giant';

interface PlanetItem {
  id: string;
  type: 'biome' | 'structure' | 'creature';
  itemType: BiomeType | StructureType | CreatureType;
  position: { x: number; y: number };
  level: number;
}

interface PlayerProfile {
  id: string;
  name: string;
  age: number;
  ageGroup: AgeGroup;

  // Resources
  crystals: number;
  artifacts: number;
  specimens: number;
  solarEnergy: number;

  // Progress
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;

  // Planet
  planetName: string;
  planetItems: PlanetItem[];
  unlockedBiomes: BiomeType[];
  unlockedStructures: StructureType[];
  unlockedCreatures: CreatureType[];

  // Stats
  mathsCorrect: number;
  englishCorrect: number;
  scienceCorrect: number;
  totalCorrect: number;
  bestCombo: number;
  offScreenMinutes: number;

  // Multiplier
  currentCombo: number;
}

interface Question {
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface PendingActivity {
  id: string;
  name: string;
  icon: string;
  minutes: number;
  solarEnergy: number;
  date: string;
}

// ============================================
// GAME CONFIG
// ============================================

// Colors - Vibrant & Game-like
const COLORS = {
  // Backgrounds
  space: '#0B0B1A',
  spaceLight: '#1A1A2E',

  // UI
  primary: '#6C5CE7',
  primaryLight: '#A29BFE',

  // Resources
  crystal: '#00D9FF',
  artifact: '#FFD93D',
  specimen: '#6BCB77',
  solar: '#FF9F43',

  // Subjects - Energizing
  maths: '#FF6B6B',
  english: '#4ECDC4',
  science: '#A855F7',

  // Feedback
  success: '#00F5A0',
  error: '#FF6B6B',
  combo: '#FFD93D',

  // Text
  text: '#FFFFFF',
  textDim: '#B0B0C0',

  // Cards
  card: '#1E1E2E',
  cardLight: '#2A2A3E',
};

// XP needed per level
const XP_PER_LEVEL = 100;

// Shop items
const BIOME_SHOP: { type: BiomeType; name: string; icon: string; cost: { crystals: number; solar: number } }[] = [
  { type: 'grass', name: 'Grassland', icon: '🌿', cost: { crystals: 0, solar: 0 } },
  { type: 'forest', name: 'Forest', icon: '🌲', cost: { crystals: 50, solar: 20 } },
  { type: 'ocean', name: 'Ocean', icon: '🌊', cost: { crystals: 80, solar: 30 } },
  { type: 'desert', name: 'Desert', icon: '🏜️', cost: { crystals: 100, solar: 40 } },
  { type: 'ice', name: 'Ice Lands', icon: '❄️', cost: { crystals: 150, solar: 50 } },
  { type: 'volcano', name: 'Volcano', icon: '🌋', cost: { crystals: 200, solar: 60 } },
  { type: 'crystal', name: 'Crystal Caves', icon: '💎', cost: { crystals: 300, solar: 80 } },
  { type: 'space', name: 'Space Station', icon: '🚀', cost: { crystals: 500, solar: 100 } },
];

const STRUCTURE_SHOP: { type: StructureType; name: string; icon: string; cost: { crystals: number; artifacts: number } }[] = [
  { type: 'house', name: 'House', icon: '🏠', cost: { crystals: 20, artifacts: 5 } },
  { type: 'tree', name: 'Magic Tree', icon: '🌳', cost: { crystals: 15, artifacts: 3 } },
  { type: 'tower', name: 'Tower', icon: '🗼', cost: { crystals: 50, artifacts: 15 } },
  { type: 'mine', name: 'Crystal Mine', icon: '⛏️', cost: { crystals: 80, artifacts: 20 } },
  { type: 'lab', name: 'Science Lab', icon: '🔬', cost: { crystals: 100, artifacts: 30 } },
  { type: 'dome', name: 'Bio Dome', icon: '🔮', cost: { crystals: 150, artifacts: 40 } },
  { type: 'bridge', name: 'Rainbow Bridge', icon: '🌈', cost: { crystals: 200, artifacts: 50 } },
  { type: 'rocket', name: 'Rocket', icon: '🚀', cost: { crystals: 400, artifacts: 100 } },
];

const CREATURE_SHOP: { type: CreatureType; name: string; icon: string; cost: { specimens: number } }[] = [
  { type: 'blob', name: 'Space Blob', icon: '🫧', cost: { specimens: 10 } },
  { type: 'floater', name: 'Floater', icon: '🎈', cost: { specimens: 25 } },
  { type: 'runner', name: 'Zoom Runner', icon: '🦎', cost: { specimens: 40 } },
  { type: 'flyer', name: 'Sky Dancer', icon: '🦋', cost: { specimens: 60 } },
  { type: 'giant', name: 'Gentle Giant', icon: '🦕', cost: { specimens: 100 } },
];

// Off-screen activities
const ACTIVITIES = [
  { id: 'outdoor', name: 'Played Outside', icon: '🌳', solarPerMin: 3 },
  { id: 'reading', name: 'Read a Book', icon: '📖', solarPerMin: 2 },
  { id: 'creative', name: 'Arts & Crafts', icon: '🎨', solarPerMin: 2 },
  { id: 'helping', name: 'Helped at Home', icon: '🏠', solarPerMin: 2 },
  { id: 'exercise', name: 'Exercise/Sport', icon: '⚽', solarPerMin: 3 },
  { id: 'social', name: 'Played with Friends', icon: '👫', solarPerMin: 2 },
];

// Age-appropriate questions config
const AGE_CONFIG: Record<AgeGroup, {
  mathsRange: { min: number; max: number };
  operations: string[];
  spellingWords: string[];
}> = {
  '5-6': {
    mathsRange: { min: 1, max: 10 },
    operations: ['addition', 'subtraction'],
    spellingWords: ['cat', 'dog', 'sun', 'mum', 'dad', 'red', 'big', 'run', 'the', 'and'],
  },
  '7-8': {
    mathsRange: { min: 1, max: 50 },
    operations: ['addition', 'subtraction', 'multiplication'],
    spellingWords: ['because', 'friend', 'school', 'house', 'people', 'water', 'about', 'would', 'their', 'could'],
  },
  '9-10': {
    mathsRange: { min: 1, max: 100 },
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
    spellingWords: ['necessary', 'separate', 'definitely', 'temperature', 'environment', 'government', 'immediately', 'interesting', 'particular', 'experience'],
  },
  '11-12': {
    mathsRange: { min: 1, max: 1000 },
    operations: ['addition', 'subtraction', 'multiplication', 'division'],
    spellingWords: ['accommodate', 'conscience', 'exaggerate', 'guarantee', 'independent', 'maintenance', 'occurrence', 'questionnaire', 'recommendation', 'surveillance'],
  },
};

// Science questions
const SCIENCE_QUESTIONS: Question[] = [
  { question: 'What planet is known as the Red Planet?', options: ['Mars', 'Venus', 'Jupiter', 'Saturn'], correctIndex: 0 },
  { question: 'How many legs does a spider have?', options: ['8', '6', '4', '10'], correctIndex: 0 },
  { question: 'What do plants need to make food?', options: ['Sunlight', 'Darkness', 'Music', 'Wind'], correctIndex: 0 },
  { question: 'What is the largest planet?', options: ['Jupiter', 'Saturn', 'Earth', 'Mars'], correctIndex: 0 },
  { question: 'What organ pumps blood?', options: ['Heart', 'Brain', 'Lungs', 'Stomach'], correctIndex: 0 },
  { question: 'What gas do we breathe in?', options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'], correctIndex: 0 },
  { question: 'How many bones in adult body?', options: ['206', '100', '300', '50'], correctIndex: 0 },
  { question: 'What is H2O?', options: ['Water', 'Salt', 'Sugar', 'Air'], correctIndex: 0 },
  { question: 'Which animal is a mammal?', options: ['Dolphin', 'Shark', 'Salmon', 'Octopus'], correctIndex: 0 },
  { question: 'What makes a rainbow?', options: ['Light & water', 'Wind', 'Clouds', 'Stars'], correctIndex: 0 },
];

// ============================================
// HELPER FUNCTIONS
// ============================================

const createDefaultProfile = (name: string, age: number): PlayerProfile => {
  const ageGroup: AgeGroup = age <= 6 ? '5-6' : age <= 8 ? '7-8' : age <= 10 ? '9-10' : '11-12';
  return {
    id: Date.now().toString(),
    name,
    age,
    ageGroup,
    crystals: 50,
    artifacts: 10,
    specimens: 5,
    solarEnergy: 30,
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: new Date().toISOString().split('T')[0],
    planetName: `${name}'s World`,
    planetItems: [
      { id: '1', type: 'biome', itemType: 'grass', position: { x: 50, y: 50 }, level: 1 },
    ],
    unlockedBiomes: ['grass'],
    unlockedStructures: [],
    unlockedCreatures: [],
    mathsCorrect: 0,
    englishCorrect: 0,
    scienceCorrect: 0,
    totalCorrect: 0,
    bestCombo: 0,
    offScreenMinutes: 0,
    currentCombo: 0,
  };
};

const getComboMultiplier = (combo: number): number => {
  if (combo >= 10) return 5;
  if (combo >= 7) return 3;
  if (combo >= 5) return 2;
  if (combo >= 3) return 1.5;
  return 1;
};

const getComboText = (combo: number): string => {
  if (combo >= 10) return '🔥 UNSTOPPABLE! 5x';
  if (combo >= 7) return '⚡ ON FIRE! 3x';
  if (combo >= 5) return '💫 AMAZING! 2x';
  if (combo >= 3) return '✨ Nice! 1.5x';
  return '';
};

// ============================================
// MAIN APP
// ============================================

export default function App() {
  // Navigation
  const [screen, setScreen] = useState<Screen>('profiles');
  const [currentMissionType, setCurrentMissionType] = useState<MissionType>('maths');

  // Profiles
  const [profiles, setProfiles] = useState<PlayerProfile[]>([]);
  const [currentProfile, setCurrentProfile] = useState<PlayerProfile | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState('');

  // Mission state
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionTotal, setSessionTotal] = useState(0);

  // Build mode
  const [buildCategory, setBuildCategory] = useState<'biomes' | 'structures' | 'creatures'>('biomes');

  // Activities
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [activityMinutes, setActivityMinutes] = useState('');
  const [showActivityModal, setShowActivityModal] = useState(false);

  // Parent mode
  const [isParentMode, setIsParentMode] = useState(false);

  // UI state
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [showReward, setShowReward] = useState<{ type: string; amount: number } | null>(null);

  // Animations
  const xpBarAnim = useRef(new Animated.Value(0)).current;
  const comboAnim = useRef(new Animated.Value(1)).current;
  const planetRotation = useRef(new Animated.Value(0)).current;
  const levelUpAnim = useRef(new Animated.Value(0)).current;

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    loadProfiles();
    loadPendingActivities();
  }, []);

  // Planet rotation animation
  useEffect(() => {
    const rotation = Animated.loop(
      Animated.timing(planetRotation, {
        toValue: 1,
        duration: 20000,
        useNativeDriver: true,
      })
    );
    rotation.start();
    return () => rotation.stop();
  }, []);

  // Update XP bar when profile changes
  useEffect(() => {
    if (currentProfile) {
      const xpInLevel = currentProfile.xp % XP_PER_LEVEL;
      Animated.timing(xpBarAnim, {
        toValue: xpInLevel / XP_PER_LEVEL,
        duration: 500,
        useNativeDriver: false,
      }).start();
    }
  }, [currentProfile?.xp]);

  // ============================================
  // DATA PERSISTENCE
  // ============================================

  const loadProfiles = async () => {
    try {
      const saved = await AsyncStorage.getItem('planetProfiles');
      if (saved) setProfiles(JSON.parse(saved));
    } catch (e) {
      console.log('Error loading profiles:', e);
    }
  };

  const saveProfiles = async (newProfiles: PlayerProfile[]) => {
    try {
      await AsyncStorage.setItem('planetProfiles', JSON.stringify(newProfiles));
      setProfiles(newProfiles);
    } catch (e) {
      console.log('Error saving profiles:', e);
    }
  };

  const loadPendingActivities = async () => {
    try {
      const saved = await AsyncStorage.getItem('planetActivities');
      if (saved) setPendingActivities(JSON.parse(saved));
    } catch (e) {}
  };

  const savePendingActivities = async (activities: PendingActivity[]) => {
    try {
      await AsyncStorage.setItem('planetActivities', JSON.stringify(activities));
      setPendingActivities(activities);
    } catch (e) {}
  };

  const updateProfile = (profile: PlayerProfile) => {
    const updated = profiles.map(p => p.id === profile.id ? profile : p);
    saveProfiles(updated);
    setCurrentProfile(profile);
  };

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================

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

    const profile = createDefaultProfile(newName.trim(), age);
    const updated = [...profiles, profile];
    saveProfiles(updated);
    setNewName('');
    setNewAge('');
    setShowCreateProfile(false);
    selectProfile(profile);
    Vibration.vibrate(100);
  };

  const selectProfile = (profile: PlayerProfile) => {
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
    setScreen('planet');
  };

  // ============================================
  // GAME LOGIC
  // ============================================

  const addXP = (amount: number) => {
    if (!currentProfile) return;

    const oldLevel = currentProfile.level;
    const newXP = currentProfile.xp + amount;
    const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;

    const updated = { ...currentProfile, xp: newXP, level: newLevel };

    if (newLevel > oldLevel) {
      // Level up!
      setShowLevelUp(true);
      Vibration.vibrate([100, 100, 100, 100, 100]);
      Animated.sequence([
        Animated.timing(levelUpAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(2000),
        Animated.timing(levelUpAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setShowLevelUp(false));

      // Bonus rewards on level up
      updated.crystals += 25 * newLevel;
      updated.solarEnergy += 10 * newLevel;
    }

    updateProfile(updated);
  };

  const addResources = (type: 'crystals' | 'artifacts' | 'specimens', baseAmount: number) => {
    if (!currentProfile) return;

    const multiplier = getComboMultiplier(currentProfile.currentCombo);
    const amount = Math.floor(baseAmount * multiplier);

    const updated = { ...currentProfile, [type]: currentProfile[type] + amount };
    updateProfile(updated);

    setShowReward({ type, amount });
    setTimeout(() => setShowReward(null), 1500);
  };

  // ============================================
  // MISSION LOGIC
  // ============================================

  const generateMathsQuestion = (): Question => {
    if (!currentProfile) return { question: '', options: [], correctIndex: 0 };

    const config = AGE_CONFIG[currentProfile.ageGroup];
    const { min, max } = config.mathsRange;
    const operation = config.operations[Math.floor(Math.random() * config.operations.length)];

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
        b = Math.floor(Math.random() * Math.min(a, max)) + 1;
        if (b > a) [a, b] = [b, a];
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
        a = b * answer;
        questionText = `${a} ÷ ${b} = ?`;
        break;
      default:
        a = Math.floor(Math.random() * max) + 1;
        b = Math.floor(Math.random() * max) + 1;
        answer = a + b;
        questionText = `${a} + ${b} = ?`;
    }

    const options = [answer];
    while (options.length < 4) {
      const wrong = answer + (Math.floor(Math.random() * 10) - 5);
      if (wrong !== answer && wrong >= 0 && !options.includes(wrong)) {
        options.push(wrong);
      }
    }

    const shuffled = options.sort(() => Math.random() - 0.5);

    return {
      question: questionText,
      options: shuffled.map(String),
      correctIndex: shuffled.indexOf(answer),
    };
  };

  const generateEnglishQuestion = (): Question => {
    if (!currentProfile) return { question: '', options: [], correctIndex: 0 };

    const config = AGE_CONFIG[currentProfile.ageGroup];
    const word = config.spellingWords[Math.floor(Math.random() * config.spellingWords.length)];

    const misspellings: string[] = [];
    const patterns = [
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
      question: 'Which spelling is correct?',
      options: shuffled,
      correctIndex: shuffled.indexOf(word),
    };
  };

  const generateScienceQuestion = (): Question => {
    const q = SCIENCE_QUESTIONS[Math.floor(Math.random() * SCIENCE_QUESTIONS.length)];
    const shuffled = [...q.options].sort(() => Math.random() - 0.5);
    return {
      ...q,
      options: shuffled,
      correctIndex: shuffled.indexOf(q.options[q.correctIndex]),
    };
  };

  const startMission = (type: MissionType) => {
    setCurrentMissionType(type);
    setSessionCorrect(0);
    setSessionTotal(0);
    if (currentProfile) {
      updateProfile({ ...currentProfile, currentCombo: 0 });
    }
    generateQuestion(type);
    setScreen('mission-play');
  };

  const generateQuestion = (type: MissionType) => {
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
  };

  const answerQuestion = (index: number) => {
    if (isAnswered || !currentQuestion || !currentProfile) return;

    setSelectedAnswer(index);
    setIsAnswered(true);

    const isCorrect = index === currentQuestion.correctIndex;

    if (isCorrect) {
      Vibration.vibrate(100);
      setSessionCorrect(prev => prev + 1);

      // Update combo
      const newCombo = currentProfile.currentCombo + 1;
      const updated = {
        ...currentProfile,
        currentCombo: newCombo,
        bestCombo: Math.max(currentProfile.bestCombo, newCombo),
        totalCorrect: currentProfile.totalCorrect + 1,
      };

      // Add subject-specific stats
      if (currentMissionType === 'maths') updated.mathsCorrect += 1;
      if (currentMissionType === 'english') updated.englishCorrect += 1;
      if (currentMissionType === 'science') updated.scienceCorrect += 1;

      updateProfile(updated);

      // Award resources
      if (currentMissionType === 'maths') addResources('crystals', 10);
      if (currentMissionType === 'english') addResources('artifacts', 5);
      if (currentMissionType === 'science') addResources('specimens', 3);

      // Award XP
      addXP(10);

      // Combo animation
      Animated.sequence([
        Animated.timing(comboAnim, { toValue: 1.3, duration: 150, useNativeDriver: true }),
        Animated.timing(comboAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
      ]).start();

    } else {
      Vibration.vibrate([50, 50, 50]);
      // Reset combo
      updateProfile({ ...currentProfile, currentCombo: 0 });
    }

    setSessionTotal(prev => prev + 1);
  };

  // ============================================
  // BUILD LOGIC
  // ============================================

  const buyBiome = (biome: typeof BIOME_SHOP[0]) => {
    if (!currentProfile) return;

    if (currentProfile.crystals < biome.cost.crystals || currentProfile.solarEnergy < biome.cost.solar) {
      Alert.alert('Not enough resources!', 'Complete more missions and outdoor activities.');
      return;
    }

    if (currentProfile.unlockedBiomes.includes(biome.type)) {
      Alert.alert('Already unlocked!', 'You already have this biome.');
      return;
    }

    const updated = {
      ...currentProfile,
      crystals: currentProfile.crystals - biome.cost.crystals,
      solarEnergy: currentProfile.solarEnergy - biome.cost.solar,
      unlockedBiomes: [...currentProfile.unlockedBiomes, biome.type],
      planetItems: [
        ...currentProfile.planetItems,
        {
          id: Date.now().toString(),
          type: 'biome' as const,
          itemType: biome.type,
          position: { x: Math.random() * 80 + 10, y: Math.random() * 80 + 10 },
          level: 1,
        },
      ],
    };

    updateProfile(updated);
    Vibration.vibrate(100);
    Alert.alert('Biome Unlocked!', `${biome.name} has been added to your planet!`);
  };

  const buyStructure = (structure: typeof STRUCTURE_SHOP[0]) => {
    if (!currentProfile) return;

    if (currentProfile.crystals < structure.cost.crystals || currentProfile.artifacts < structure.cost.artifacts) {
      Alert.alert('Not enough resources!', 'Complete more missions to earn crystals and artifacts.');
      return;
    }

    const updated = {
      ...currentProfile,
      crystals: currentProfile.crystals - structure.cost.crystals,
      artifacts: currentProfile.artifacts - structure.cost.artifacts,
      unlockedStructures: [...currentProfile.unlockedStructures, structure.type],
      planetItems: [
        ...currentProfile.planetItems,
        {
          id: Date.now().toString(),
          type: 'structure' as const,
          itemType: structure.type,
          position: { x: Math.random() * 70 + 15, y: Math.random() * 70 + 15 },
          level: 1,
        },
      ],
    };

    updateProfile(updated);
    Vibration.vibrate(100);
    Alert.alert('Structure Built!', `${structure.name} has been added to your planet!`);
  };

  const buyCreature = (creature: typeof CREATURE_SHOP[0]) => {
    if (!currentProfile) return;

    if (currentProfile.specimens < creature.cost.specimens) {
      Alert.alert('Not enough specimens!', 'Complete more science missions.');
      return;
    }

    const updated = {
      ...currentProfile,
      specimens: currentProfile.specimens - creature.cost.specimens,
      unlockedCreatures: [...currentProfile.unlockedCreatures, creature.type],
      planetItems: [
        ...currentProfile.planetItems,
        {
          id: Date.now().toString(),
          type: 'creature' as const,
          itemType: creature.type,
          position: { x: Math.random() * 60 + 20, y: Math.random() * 60 + 20 },
          level: 1,
        },
      ],
    };

    updateProfile(updated);
    Vibration.vibrate(100);
    Alert.alert('Creature Added!', `${creature.name} now lives on your planet!`);
  };

  // ============================================
  // ACTIVITY LOGIC
  // ============================================

  const submitActivity = () => {
    if (!selectedActivity || !activityMinutes || !currentProfile) return;

    const minutes = parseInt(activityMinutes);
    if (isNaN(minutes) || minutes <= 0 || minutes > 180) {
      Alert.alert('Oops!', 'Please enter valid minutes (1-180)');
      return;
    }

    const activityType = ACTIVITIES.find(a => a.id === selectedActivity);
    if (!activityType) return;

    const activity: PendingActivity = {
      id: Date.now().toString(),
      name: activityType.name,
      icon: activityType.icon,
      minutes,
      solarEnergy: Math.round(minutes * activityType.solarPerMin),
      date: new Date().toISOString(),
    };

    savePendingActivities([...pendingActivities, activity]);
    setSelectedActivity(null);
    setActivityMinutes('');
    setShowActivityModal(false);

    Alert.alert('Activity Logged!', `Ask a parent to verify to earn ${activity.solarEnergy} Solar Energy!`);
  };

  const verifyActivity = (activityId: string) => {
    const activity = pendingActivities.find(a => a.id === activityId);
    if (!activity || !currentProfile) return;

    const updated = {
      ...currentProfile,
      solarEnergy: currentProfile.solarEnergy + activity.solarEnergy,
      offScreenMinutes: currentProfile.offScreenMinutes + activity.minutes,
    };
    updateProfile(updated);

    savePendingActivities(pendingActivities.filter(a => a.id !== activityId));
    Vibration.vibrate(100);
  };

  // ============================================
  // RENDER FUNCTIONS
  // ============================================

  const renderProfiles = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🪐 Planet Builders</Text>
        <Text style={styles.headerSubtitle}>Choose your explorer</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.profilesGrid}>
        {profiles.map(profile => (
          <TouchableOpacity
            key={profile.id}
            style={styles.profileCard}
            onPress={() => selectProfile(profile)}
          >
            <Text style={styles.profilePlanet}>🌍</Text>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileLevel}>Level {profile.level}</Text>
            <View style={styles.profileStatsRow}>
              <Text style={styles.profileStat}>💎 {profile.crystals}</Text>
              <Text style={styles.profileStat}>☀️ {profile.solarEnergy}</Text>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity
          style={[styles.profileCard, styles.addProfileCard]}
          onPress={() => setShowCreateProfile(true)}
        >
          <Text style={styles.addIcon}>+</Text>
          <Text style={styles.addText}>New Explorer</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Create Profile Modal */}
      <Modal visible={showCreateProfile} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>New Explorer</Text>

            <TextInput
              style={styles.input}
              placeholder="Name"
              placeholderTextColor={COLORS.textDim}
              value={newName}
              onChangeText={setNewName}
            />

            <TextInput
              style={styles.input}
              placeholder="Age (4-14)"
              placeholderTextColor={COLORS.textDim}
              value={newAge}
              onChangeText={setNewAge}
              keyboardType="number-pad"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setShowCreateProfile(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn]}
                onPress={createProfile}
              >
                <Text style={styles.confirmBtnText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );

  const renderPlanet = () => {
    if (!currentProfile) return null;

    const spin = planetRotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });

    return (
      <SafeAreaView style={styles.container}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => setScreen('profiles')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.planetTitle}>{currentProfile.planetName}</Text>
          <TouchableOpacity onPress={() => setScreen('leaderboard')}>
            <Text style={styles.leaderboardBtn}>🏆</Text>
          </TouchableOpacity>
        </View>

        {/* Resource Bar */}
        <View style={styles.resourceBar}>
          <View style={styles.resource}>
            <Text style={styles.resourceIcon}>💎</Text>
            <Text style={styles.resourceValue}>{currentProfile.crystals}</Text>
          </View>
          <View style={styles.resource}>
            <Text style={styles.resourceIcon}>📜</Text>
            <Text style={styles.resourceValue}>{currentProfile.artifacts}</Text>
          </View>
          <View style={styles.resource}>
            <Text style={styles.resourceIcon}>🧬</Text>
            <Text style={styles.resourceValue}>{currentProfile.specimens}</Text>
          </View>
          <View style={styles.resource}>
            <Text style={styles.resourceIcon}>☀️</Text>
            <Text style={styles.resourceValue}>{currentProfile.solarEnergy}</Text>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.xpContainer}>
          <Text style={styles.levelText}>Level {currentProfile.level}</Text>
          <View style={styles.xpBarBg}>
            <Animated.View
              style={[
                styles.xpBarFill,
                { width: xpBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) },
              ]}
            />
          </View>
          <Text style={styles.xpText}>{currentProfile.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP</Text>
        </View>

        {/* Planet View */}
        <View style={styles.planetContainer}>
          <Animated.View style={[styles.planet, { transform: [{ rotate: spin }] }]}>
            {currentProfile.planetItems.map(item => (
              <Text
                key={item.id}
                style={[
                  styles.planetItem,
                  { left: `${item.position.x}%`, top: `${item.position.y}%` },
                ]}
              >
                {item.type === 'biome' && BIOME_SHOP.find(b => b.type === item.itemType)?.icon}
                {item.type === 'structure' && STRUCTURE_SHOP.find(s => s.type === item.itemType)?.icon}
                {item.type === 'creature' && CREATURE_SHOP.find(c => c.type === item.itemType)?.icon}
              </Text>
            ))}
          </Animated.View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.crystal }]}
            onPress={() => setScreen('missions')}
          >
            <Text style={styles.actionIcon}>🎯</Text>
            <Text style={styles.actionText}>Missions</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.artifact }]}
            onPress={() => setScreen('build')}
          >
            <Text style={styles.actionIcon}>🔨</Text>
            <Text style={styles.actionText}>Build</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.solar }]}
            onPress={() => setShowActivityModal(true)}
          >
            <Text style={styles.actionIcon}>☀️</Text>
            <Text style={styles.actionText}>Solar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: COLORS.primaryLight }]}
            onPress={() => setIsParentMode(true)}
          >
            <Text style={styles.actionIcon}>👨‍👩‍👧</Text>
            <Text style={styles.actionText}>Parent</Text>
          </TouchableOpacity>
        </View>

        {/* Streak */}
        {currentProfile.streak > 0 && (
          <View style={styles.streakBadge}>
            <Text style={styles.streakText}>🔥 {currentProfile.streak} day streak!</Text>
          </View>
        )}

        {/* Activity Modal */}
        <Modal visible={showActivityModal} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>☀️ Collect Solar Energy</Text>
              <Text style={styles.modalSubtitle}>What did you do offline?</Text>

              <ScrollView style={styles.activityList}>
                {ACTIVITIES.map(activity => (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.activityOption,
                      selectedActivity === activity.id && styles.activitySelected,
                    ]}
                    onPress={() => setSelectedActivity(activity.id)}
                  >
                    <Text style={styles.activityIcon}>{activity.icon}</Text>
                    <Text style={styles.activityName}>{activity.name}</Text>
                    <Text style={styles.activityRate}>{activity.solarPerMin}☀️/min</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {selectedActivity && (
                <View style={styles.minutesInput}>
                  <Text style={styles.minutesLabel}>How many minutes?</Text>
                  <TextInput
                    style={styles.input}
                    value={activityMinutes}
                    onChangeText={setActivityMinutes}
                    keyboardType="number-pad"
                    placeholder="30"
                    placeholderTextColor={COLORS.textDim}
                  />
                </View>
              )}

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalBtn, styles.cancelBtn]}
                  onPress={() => {
                    setShowActivityModal(false);
                    setSelectedActivity(null);
                    setActivityMinutes('');
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modalBtn, styles.confirmBtn]}
                  onPress={submitActivity}
                >
                  <Text style={styles.confirmBtnText}>Log Activity</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  };

  const renderMissions = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('planet')}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Mission</Text>
      </View>

      <View style={styles.missionCards}>
        <TouchableOpacity
          style={[styles.missionCard, { backgroundColor: COLORS.maths }]}
          onPress={() => startMission('maths')}
        >
          <Text style={styles.missionIcon}>💎</Text>
          <Text style={styles.missionTitle}>Crystal Mining</Text>
          <Text style={styles.missionDesc}>Solve maths to mine crystals</Text>
          <Text style={styles.missionReward}>+10 💎 per correct</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.missionCard, { backgroundColor: COLORS.english }]}
          onPress={() => startMission('english')}
        >
          <Text style={styles.missionIcon}>📜</Text>
          <Text style={styles.missionTitle}>Artifact Hunt</Text>
          <Text style={styles.missionDesc}>Spell words to find artifacts</Text>
          <Text style={styles.missionReward}>+5 📜 per correct</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.missionCard, { backgroundColor: COLORS.science }]}
          onPress={() => startMission('science')}
        >
          <Text style={styles.missionIcon}>🧬</Text>
          <Text style={styles.missionTitle}>Specimen Research</Text>
          <Text style={styles.missionDesc}>Answer science to collect specimens</Text>
          <Text style={styles.missionReward}>+3 🧬 per correct</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  const renderMissionPlay = () => {
    if (!currentQuestion || !currentProfile) return null;

    const missionColors = {
      maths: COLORS.maths,
      english: COLORS.english,
      science: COLORS.science,
    };

    const missionBgs = {
      maths: '#1A0A0A',
      english: '#0A1A1A',
      science: '#1A0A1A',
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: missionBgs[currentMissionType] }]}>
        {/* Header */}
        <View style={styles.missionHeader}>
          <TouchableOpacity onPress={() => setScreen('planet')}>
            <Text style={styles.backBtn}>← Exit</Text>
          </TouchableOpacity>

          <Animated.View style={[styles.comboBadge, { transform: [{ scale: comboAnim }] }]}>
            {currentProfile.currentCombo > 0 && (
              <Text style={styles.comboText}>
                {getComboText(currentProfile.currentCombo) || `${currentProfile.currentCombo}x`}
              </Text>
            )}
          </Animated.View>

          <Text style={styles.scoreText}>✓ {sessionCorrect}/{sessionTotal}</Text>
        </View>

        {/* Question */}
        <View style={styles.questionBox}>
          <Text style={styles.questionText}>{currentQuestion.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsGrid}>
          {currentQuestion.options.map((option, index) => {
            let optionStyle = styles.optionBtn;
            let textStyle = styles.optionText;

            if (isAnswered) {
              if (index === currentQuestion.correctIndex) {
                optionStyle = { ...styles.optionBtn, ...styles.correctOption };
              } else if (index === selectedAnswer) {
                optionStyle = { ...styles.optionBtn, ...styles.wrongOption };
              }
            }

            return (
              <TouchableOpacity
                key={index}
                style={optionStyle}
                onPress={() => answerQuestion(index)}
                disabled={isAnswered}
              >
                <Text style={textStyle}>{option}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Next Button */}
        {isAnswered && (
          <TouchableOpacity
            style={[styles.nextBtn, { backgroundColor: missionColors[currentMissionType] }]}
            onPress={() => generateQuestion(currentMissionType)}
          >
            <Text style={styles.nextBtnText}>Next Question →</Text>
          </TouchableOpacity>
        )}

        {/* Reward Popup */}
        {showReward && (
          <View style={styles.rewardPopup}>
            <Text style={styles.rewardText}>
              +{showReward.amount} {showReward.type === 'crystals' ? '💎' : showReward.type === 'artifacts' ? '📜' : '🧬'}
            </Text>
          </View>
        )}
      </SafeAreaView>
    );
  };

  const renderBuild = () => {
    if (!currentProfile) return null;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setScreen('planet')}>
            <Text style={styles.backBtn}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>🔨 Build</Text>
        </View>

        {/* Category Tabs */}
        <View style={styles.categoryTabs}>
          <TouchableOpacity
            style={[styles.categoryTab, buildCategory === 'biomes' && styles.categoryTabActive]}
            onPress={() => setBuildCategory('biomes')}
          >
            <Text style={styles.categoryTabText}>Biomes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryTab, buildCategory === 'structures' && styles.categoryTabActive]}
            onPress={() => setBuildCategory('structures')}
          >
            <Text style={styles.categoryTabText}>Structures</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.categoryTab, buildCategory === 'creatures' && styles.categoryTabActive]}
            onPress={() => setBuildCategory('creatures')}
          >
            <Text style={styles.categoryTabText}>Creatures</Text>
          </TouchableOpacity>
        </View>

        {/* Resources */}
        <View style={styles.buildResources}>
          <Text style={styles.buildResource}>💎 {currentProfile.crystals}</Text>
          <Text style={styles.buildResource}>📜 {currentProfile.artifacts}</Text>
          <Text style={styles.buildResource}>🧬 {currentProfile.specimens}</Text>
          <Text style={styles.buildResource}>☀️ {currentProfile.solarEnergy}</Text>
        </View>

        {/* Shop Items */}
        <ScrollView style={styles.shopList}>
          {buildCategory === 'biomes' && BIOME_SHOP.map(biome => (
            <TouchableOpacity
              key={biome.type}
              style={[
                styles.shopItem,
                currentProfile.unlockedBiomes.includes(biome.type) && styles.shopItemOwned,
              ]}
              onPress={() => buyBiome(biome)}
              disabled={currentProfile.unlockedBiomes.includes(biome.type)}
            >
              <Text style={styles.shopIcon}>{biome.icon}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{biome.name}</Text>
                {currentProfile.unlockedBiomes.includes(biome.type) ? (
                  <Text style={styles.shopOwned}>✓ Owned</Text>
                ) : (
                  <Text style={styles.shopCost}>💎 {biome.cost.crystals} + ☀️ {biome.cost.solar}</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}

          {buildCategory === 'structures' && STRUCTURE_SHOP.map(structure => (
            <TouchableOpacity
              key={structure.type}
              style={styles.shopItem}
              onPress={() => buyStructure(structure)}
            >
              <Text style={styles.shopIcon}>{structure.icon}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{structure.name}</Text>
                <Text style={styles.shopCost}>💎 {structure.cost.crystals} + 📜 {structure.cost.artifacts}</Text>
              </View>
            </TouchableOpacity>
          ))}

          {buildCategory === 'creatures' && CREATURE_SHOP.map(creature => (
            <TouchableOpacity
              key={creature.type}
              style={styles.shopItem}
              onPress={() => buyCreature(creature)}
            >
              <Text style={styles.shopIcon}>{creature.icon}</Text>
              <View style={styles.shopInfo}>
                <Text style={styles.shopName}>{creature.name}</Text>
                <Text style={styles.shopCost}>🧬 {creature.cost.specimens}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  };

  const renderLeaderboard = () => (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setScreen('planet')}>
          <Text style={styles.backBtn}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>🏆 Leaderboard</Text>
      </View>

      <ScrollView style={styles.content}>
        {profiles
          .sort((a, b) => b.level * 1000 + b.xp - (a.level * 1000 + a.xp))
          .map((profile, index) => (
            <View
              key={profile.id}
              style={[
                styles.leaderboardItem,
                index === 0 && styles.leaderboardFirst,
              ]}
            >
              <Text style={styles.leaderboardRank}>
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
              </Text>
              <View style={styles.leaderboardInfo}>
                <Text style={styles.leaderboardName}>{profile.name}</Text>
                <Text style={styles.leaderboardStats}>
                  Level {profile.level} • {profile.planetItems.length} items • {profile.totalCorrect} correct
                </Text>
              </View>
              <Text style={styles.leaderboardXP}>{profile.xp} XP</Text>
            </View>
          ))}
      </ScrollView>
    </SafeAreaView>
  );

  const renderParentMode = () => (
    <Modal visible={isParentMode} animationType="slide">
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setIsParentMode(false)}>
            <Text style={styles.backBtn}>← Done</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Parent Mode</Text>
        </View>

        <ScrollView style={styles.content}>
          <Text style={styles.sectionTitle}>Activities to Verify</Text>

          {pendingActivities.length === 0 ? (
            <Text style={styles.emptyText}>No activities waiting</Text>
          ) : (
            pendingActivities.map(activity => (
              <View key={activity.id} style={styles.verifyCard}>
                <Text style={styles.verifyIcon}>{activity.icon}</Text>
                <View style={styles.verifyInfo}>
                  <Text style={styles.verifyName}>{activity.name}</Text>
                  <Text style={styles.verifyDetails}>
                    {activity.minutes} mins • +{activity.solarEnergy} ☀️
                  </Text>
                </View>
                <View style={styles.verifyButtons}>
                  <TouchableOpacity
                    style={styles.verifyYes}
                    onPress={() => verifyActivity(activity.id)}
                  >
                    <Text style={styles.verifyYesText}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.verifyNo}
                    onPress={() => savePendingActivities(pendingActivities.filter(a => a.id !== activity.id))}
                  >
                    <Text style={styles.verifyNoText}>✗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          {currentProfile && (
            <>
              <Text style={styles.sectionTitle}>{currentProfile.name}'s Stats</Text>
              <View style={styles.parentStats}>
                <Text style={styles.parentStat}>📊 Level {currentProfile.level} ({currentProfile.xp} XP)</Text>
                <Text style={styles.parentStat}>💎 Maths: {currentProfile.mathsCorrect} correct</Text>
                <Text style={styles.parentStat}>📜 English: {currentProfile.englishCorrect} correct</Text>
                <Text style={styles.parentStat}>🧬 Science: {currentProfile.scienceCorrect} correct</Text>
                <Text style={styles.parentStat}>☀️ Off-screen: {currentProfile.offScreenMinutes} mins</Text>
                <Text style={styles.parentStat}>🔥 Best combo: {currentProfile.bestCombo}x</Text>
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );

  const renderLevelUp = () => (
    <Modal visible={showLevelUp} transparent>
      <Animated.View style={[styles.levelUpOverlay, { opacity: levelUpAnim }]}>
        <Text style={styles.levelUpText}>⬆️ LEVEL UP! ⬆️</Text>
        <Text style={styles.levelUpLevel}>Level {currentProfile?.level}</Text>
        <Text style={styles.levelUpReward}>
          +{(currentProfile?.level || 1) * 25} 💎 +{(currentProfile?.level || 1) * 10} ☀️
        </Text>
      </Animated.View>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={styles.app}>
      <StatusBar style="light" />

      {screen === 'profiles' && renderProfiles()}
      {screen === 'planet' && renderPlanet()}
      {screen === 'missions' && renderMissions()}
      {screen === 'mission-play' && renderMissionPlay()}
      {screen === 'build' && renderBuild()}
      {screen === 'leaderboard' && renderLeaderboard()}

      {renderParentMode()}
      {renderLevelUp()}
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  app: {
    flex: 1,
    backgroundColor: COLORS.space,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.space,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  headerSubtitle: {
    fontSize: 16,
    color: COLORS.textDim,
    textAlign: 'center',
    marginTop: 5,
  },
  backBtn: {
    fontSize: 16,
    color: COLORS.primaryLight,
  },

  content: {
    flex: 1,
    padding: 20,
  },

  // Profiles
  profilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 15,
    padding: 20,
  },
  profileCard: {
    width: width * 0.4,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardLight,
  },
  profilePlanet: {
    fontSize: 50,
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  profileLevel: {
    fontSize: 14,
    color: COLORS.primaryLight,
    marginTop: 4,
  },
  profileStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  profileStat: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  addProfileCard: {
    borderStyle: 'dashed',
    borderColor: COLORS.textDim,
    justifyContent: 'center',
  },
  addIcon: {
    fontSize: 40,
    color: COLORS.textDim,
  },
  addText: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 10,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: width * 0.85,
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 25,
    maxHeight: height * 0.8,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  modalBtn: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: COLORS.cardLight,
  },
  cancelBtnText: {
    color: COLORS.textDim,
    fontWeight: '600',
  },
  confirmBtn: {
    backgroundColor: COLORS.primary,
  },
  confirmBtnText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  input: {
    backgroundColor: COLORS.cardLight,
    borderRadius: 12,
    padding: 15,
    fontSize: 16,
    color: COLORS.text,
    marginBottom: 15,
  },

  // Planet Screen
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  planetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  leaderboardBtn: {
    fontSize: 24,
  },

  resourceBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: COLORS.card,
    marginHorizontal: 15,
    borderRadius: 15,
  },
  resource: {
    alignItems: 'center',
  },
  resourceIcon: {
    fontSize: 20,
  },
  resourceValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 4,
  },

  xpContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  levelText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
    marginBottom: 5,
  },
  xpBarBg: {
    height: 12,
    backgroundColor: COLORS.cardLight,
    borderRadius: 6,
    overflow: 'hidden',
  },
  xpBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 6,
  },
  xpText: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 5,
    textAlign: 'right',
  },

  planetContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planet: {
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: COLORS.cardLight,
    position: 'relative',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
    elevation: 10,
  },
  planetItem: {
    position: 'absolute',
    fontSize: 24,
  },

  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
  },
  actionBtn: {
    padding: 15,
    borderRadius: 15,
    alignItems: 'center',
    width: 75,
  },
  actionIcon: {
    fontSize: 24,
  },
  actionText: {
    fontSize: 11,
    color: COLORS.text,
    marginTop: 5,
    fontWeight: '600',
  },

  streakBadge: {
    position: 'absolute',
    top: 100,
    right: 20,
    backgroundColor: COLORS.combo,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  streakText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },

  // Missions
  missionCards: {
    padding: 20,
    gap: 15,
  },
  missionCard: {
    padding: 25,
    borderRadius: 20,
    alignItems: 'center',
  },
  missionIcon: {
    fontSize: 50,
    marginBottom: 10,
  },
  missionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  missionDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 5,
  },
  missionReward: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },

  // Mission Play
  missionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
  },
  comboBadge: {
    backgroundColor: COLORS.combo,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  comboText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000',
  },
  scoreText: {
    fontSize: 16,
    color: COLORS.text,
    fontWeight: 'bold',
  },

  questionBox: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 30,
    margin: 20,
    alignItems: 'center',
  },
  questionText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },

  optionsGrid: {
    padding: 20,
    gap: 12,
  },
  optionBtn: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 18,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.cardLight,
  },
  optionText: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.text,
  },
  correctOption: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  wrongOption: {
    backgroundColor: COLORS.error,
    borderColor: COLORS.error,
  },

  nextBtn: {
    margin: 20,
    padding: 18,
    borderRadius: 15,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },

  rewardPopup: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    backgroundColor: COLORS.combo,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 20,
  },
  rewardText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },

  // Build
  categoryTabs: {
    flexDirection: 'row',
    marginHorizontal: 15,
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 5,
  },
  categoryTab: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  categoryTabActive: {
    backgroundColor: COLORS.primary,
  },
  categoryTabText: {
    color: COLORS.text,
    fontWeight: '600',
  },

  buildResources: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
  },
  buildResource: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: 'bold',
  },

  shopList: {
    flex: 1,
    padding: 15,
  },
  shopItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  shopItemOwned: {
    opacity: 0.5,
  },
  shopIcon: {
    fontSize: 36,
    marginRight: 15,
  },
  shopInfo: {
    flex: 1,
  },
  shopName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  shopCost: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  shopOwned: {
    fontSize: 14,
    color: COLORS.success,
    marginTop: 4,
  },

  // Leaderboard
  leaderboardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  leaderboardFirst: {
    borderWidth: 2,
    borderColor: COLORS.combo,
  },
  leaderboardRank: {
    fontSize: 24,
    width: 50,
    textAlign: 'center',
  },
  leaderboardInfo: {
    flex: 1,
    marginLeft: 10,
  },
  leaderboardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  leaderboardStats: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 4,
  },
  leaderboardXP: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryLight,
  },

  // Activities
  activityList: {
    maxHeight: 200,
  },
  activityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: COLORS.cardLight,
  },
  activitySelected: {
    backgroundColor: COLORS.primary,
  },
  activityIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  activityName: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
  },
  activityRate: {
    fontSize: 12,
    color: COLORS.solar,
  },
  minutesInput: {
    marginTop: 15,
  },
  minutesLabel: {
    fontSize: 14,
    color: COLORS.textDim,
    marginBottom: 10,
  },

  // Parent Mode
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 15,
    marginTop: 20,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textDim,
    textAlign: 'center',
    padding: 30,
  },
  verifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
  },
  verifyIcon: {
    fontSize: 30,
    marginRight: 12,
  },
  verifyInfo: {
    flex: 1,
  },
  verifyName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  verifyDetails: {
    fontSize: 14,
    color: COLORS.textDim,
    marginTop: 4,
  },
  verifyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  verifyYes: {
    backgroundColor: COLORS.success,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyYesText: {
    fontSize: 18,
    color: '#000',
  },
  verifyNo: {
    backgroundColor: COLORS.error,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyNoText: {
    fontSize: 18,
    color: '#fff',
  },
  parentStats: {
    backgroundColor: COLORS.card,
    borderRadius: 15,
    padding: 15,
  },
  parentStat: {
    fontSize: 14,
    color: COLORS.text,
    paddingVertical: 6,
  },

  // Level Up
  levelUpOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelUpText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: COLORS.combo,
    textShadowColor: COLORS.combo,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 20,
  },
  levelUpLevel: {
    fontSize: 60,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 20,
  },
  levelUpReward: {
    fontSize: 20,
    color: COLORS.success,
    marginTop: 20,
  },
});
