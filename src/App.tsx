/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef, memo, ReactNode, ErrorInfo } from 'react';
import { 
  Home, 
  MessageSquare, 
  Plus, 
  BarChart2, 
  Users, 
  Settings, 
  Search, 
  Bell,
  CheckCircle2,
  Star,
  Award,
  User as UserIcon,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  X,
  Trash2,
  AlertTriangle,
  LogIn,
  LogOut,
  Loader2,
  ArrowUpDown,
  Pin,
  Check,
  Zap,
  Camera,
  Image as ImageIcon,
  Sun,
  Moon,
  Clock,
  Download,
  Upload,
  Play,
  Square
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { View, Win, Tag as AppTag } from './types';
import { auth } from './lib/firebase';
import { supabase } from './lib/supabase';
import { 
  signInWithPopup, 
  GoogleAuthProvider
} from 'firebase/auth';
import { analyzeWins, chatWithAI, getEmbedding } from './services/geminiService';

interface DraftEntry {
  id: string;
  text: string;
  tags: string[];
  starred: boolean;
  pinned: boolean;
  isHabitMode?: boolean;
  imageUrl?: string;
  reflections?: string;
  embedding?: number[];
  createdAt?: number;
  isBeDoHave?: boolean;
  beText?: string;
  doText?: string;
  haveText?: string;
}

const QUOTES = [
  { text: "Segala perkara dapat kutanggung di dalam Dia yang memberi kekuatan kepadaku.", author: "Filipi 4:13" },
  { text: "Sebab Aku tahu rancangan-Ku bagimu: rancangan damai sejahtera untuk masa depan penuh harapan.", author: "Yeremia 29:11" },
  { text: "Janganlah takut, sebab Aku menyertaimu; janganlah bimbang, sebab Aku ini Allahmu.", author: "Yesaya 41:10" },
  { text: "Serahkanlah perbuatanmu kepada TUHAN, maka terlaksanalah segala rencanamu.", author: "Amsal 16:3" },
  { text: "Tuhan adalah gembalaku, takkan kekurangan aku.", author: "Mazmur 23:1" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Your speed doesn't matter, forward is forward.", author: "Anonymous" }
];

const TRANSLATIONS = {
  EN: {
    welcome: "Winning",
    quote_prefix: "Your wins are the currency of your growth.",
    start_winning: "Start Winning",
    logging_in: "Logging in...",
    notifications: "Notifications",
    daily_streak: "Day Streak",
    stats_today: "Wins Today",
    weekly_momentum: "Weekly Momentum",
    activity: "Activity",
    habit_history: "Habit History",
    total: "Total",
    add_habit: "Add Habit",
    save: "Save",
    explore: "Explore",
    stats: "Stats",
    chat: "Coach",
    profile: "Profile",
    logout: "Logout",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    no_wins: "No wins yet. Start small!",
    chat_prompt: "What's on your mind?",
    starred_insights: "Starred Insights",
    search_placeholder: "Search your wins...",
    delete: "Delete",
    confirm_delete: "Are you sure?",
    edit: "Edit",
    cancel: "Cancel"
  },
  ID: {
    welcome: "Winning",
    quote_prefix: "Kemenanganmu adalah mata uang pertumbuhanmu.",
    start_winning: "Mulai Menang",
    logging_in: "Sedang Masuk...",
    notifications: "Notifikasi",
    daily_streak: "Hari Beruntun",
    stats_today: "Kemenangan Hari Ini",
    weekly_momentum: "Momentum Mingguan",
    activity: "Aktivitas",
    habit_history: "Riwayat Kebiasaan",
    total: "Total",
    add_habit: "Tambah Kebiasaan",
    save: "Simpan",
    explore: "Eksplorasi",
    stats: "Statistik",
    chat: "Pelatih",
    profile: "Profil",
    logout: "Keluar",
    theme: "Tema",
    light: "Terang",
    dark: "Gelap",
    no_wins: "Belum ada kemenangan. Mulai dari yang kecil!",
    chat_prompt: "Apa yang ada di pikiran kamu?",
    starred_insights: "Insight Terpilih",
    search_placeholder: "Cari kemenangan kamu...",
    delete: "Hapus",
    confirm_delete: "Kamu yakin?",
    edit: "Edit",
    cancel: "Batal"
  }
};

const cleanAiResponse = (text: string): string => {
  if (!text) return "";
  // Strip token usage footer: \n\n[Token Terpakai - Input: ..., Output: ...]
  return text.split("\n\n[Token Terpakai -")[0].trim();
};

// App Error Boundary
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    const { hasError, error } = this.state;
    if (hasError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center">
            <X className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-background">Something went wrong</h1>
          <div className="text-on-surface-variant max-w-md italic shadow-sm bg-surface p-4 rounded-lg">
            <p>{error?.message || "An unexpected error occurred while rendering the application."}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-6 py-2 bg-primary text-white rounded-full font-bold shadow-lg active:scale-95 transition-transform"
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        
        // We use a safe maximum dimension of 500px, which looks crisp on mobile
        // but generates tiny file sizes (15KB - 40KB) that save flawlessly in Firestore.
        const MAX_DIM = 500;
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // Compress to JPEG with 0.5 quality for ultimate reliability and tiny size
        const dataUrl = canvas.toDataURL('image/jpeg', 0.5);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error("Gagal membaca orientasi atau memuat gambar"));
    };
    reader.onerror = () => reject(new Error("Gagal membaca file foto"));
  });
};

export default function App() {
  return (
    <AppErrorBoundary>
      <AppContent />
    </AppErrorBoundary>
  );
}

function AppContent() {
  const [language, setLanguage] = useState<'EN' | 'ID'>('ID');
  const t = TRANSLATIONS[language];
  const [activeView, setActiveView] = useState<View>('home');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loggingIn, setLoggingIn] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authUsername, setAuthUsername] = useState('');
  const [hasAuthHint, setHasAuthHint] = useState(() => {
    try {
      return typeof window !== 'undefined' && !!localStorage.getItem('streak_auth_hint');
    } catch {
      return false;
    }
  });
  const [wins, setWins] = useState<Win[]>([]);
  const [insightPeriod, setInsightPeriod] = useState<'week' | 'month' | 'year'>('year');
  const [exploreSortOrder, setExploreSortOrder] = useState<'desc' | 'asc'>('desc');
  const [registeredTags, setRegisteredTags] = useState<AppTag[]>([]);
  
  // Performance optimization: Pre-group wins by date string for O(1) lookup in Record view
  const winsByDate = useMemo(() => {
    const map: { [dateKey: string]: Win[] } = {};
    wins.forEach(win => {
      if (!win || !win.createdAt) return;
      // Handle both Firestore Timestamp and regular number/Date
      const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
      if (isNaN(d.getTime())) return;
      const key = d.toDateString();
      if (!map[key]) map[key] = [];
      map[key].push(win);
    });
    
    // Sort each date group by createdAt descending
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return timeB - timeA;
      });
    });
    
    return map;
  }, [wins]);
  
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [templates, setTemplates] = useState<string[]>([]);
  const [aiMemory, setAiMemory] = useState<string>('');
  const [newTemplate, setNewTemplate] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [compressingId, setCompressingId] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const [selectedMasterHabit, setSelectedMasterHabit] = useState<string | null>(null);

  const [allWins, setAllWins] = useState<Win[]>([]);
  const [fetchingAll, setFetchingAll] = useState(false);

  const [tokenLogs, setTokenLogs] = useState<{ id: string; functionName: string; inputTokens: number; outputTokens: number; createdAt: any }[]>([]);
  const [isTokenLogsExpanded, setIsTokenLogsExpanded] = useState(false);
  const [tokenTimeframeFilter, setTokenTimeframeFilter] = useState<'All' | 'Day' | 'Week' | 'Month' | 'Year'>('All');
  
  const getPast6Days = () => {
    const options = [];
    const monthNames = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
    const monthNamesID = ["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"];
    
    for (let i = 0; i < 6; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = d.getDate();
      const monthIndex = d.getMonth();
      const labelEN = `${monthNames[monthIndex]} ${day}`;
      const labelID = `${day} ${monthNamesID[monthIndex]}`;
      options.push({
        labelEN,
        labelID,
        key: d.toISOString().split('T')[0]
      });
    }
    return options;
  };

  const [selectedTokenDayKey, setSelectedTokenDayKey] = useState<string>(() => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  });

  const filteredTokenLogs = useMemo(() => {
    if (tokenTimeframeFilter === 'All') {
      return tokenLogs;
    }
    
    const now = Date.now();
    
    if (tokenTimeframeFilter === 'Day') {
      return tokenLogs.filter(log => {
        const logDateObj = new Date(log.createdAt);
        const logDayKey = logDateObj.toISOString().split('T')[0];
        return logDayKey === selectedTokenDayKey;
      });
    }
    
    if (tokenTimeframeFilter === 'Week') {
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      return tokenLogs.filter(log => log.createdAt >= sevenDaysAgo);
    }
    
    if (tokenTimeframeFilter === 'Month') {
      const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
      return tokenLogs.filter(log => log.createdAt >= thirtyDaysAgo);
    }
    
    if (tokenTimeframeFilter === 'Year') {
      const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000;
      return tokenLogs.filter(log => log.createdAt >= oneYearAgo);
    }
    
    return tokenLogs;
  }, [tokenLogs, tokenTimeframeFilter, selectedTokenDayKey]);

  // Wisdom Voice Text To Speech
  const [currentlySpeakingId, setCurrentlySpeakingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
    return () => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const toggleSpeech = (id: string, textToSpeak: string) => {
    if (!window.speechSynthesis) {
      alert(language === 'ID' ? 'Browser Anda tidak mendukung Text-to-Speech.' : 'Your browser does not support Text-to-Speech.');
      return;
    }

    if (window.speechSynthesis.speaking && currentlySpeakingId === id) {
      window.speechSynthesis.cancel();
      setCurrentlySpeakingId(null);
      return;
    }

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    setCurrentlySpeakingId(id);

    // Filter out hashtags or special formatting for cleaner speech narration
    const cleanSpeechText = textToSpeak
      .replace(/#\w+/g, '') // remove tags
      .replace(/[*_`~]/g, '') // remove markdown symbols
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanSpeechText);
    
    // Low, resonant pitch (0.70) and calm, slow speaking rate (0.8) to give an ultra-deep, wise, reflective male persona
    utterance.pitch = 0.70; 
    utterance.rate = 0.80;

    // Detect language of text - Always English for the wise wisdom narrator
    const langCode = 'en-US';
    utterance.lang = langCode;

    // Select suitable voice (English Male)
    const voices = window.speechSynthesis.getVoices();
    
    // Filter voices that are English (en-)
    const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
    
    // Specifically target male english voices
    const maleVoices = englishVoices.filter(v => {
      const name = v.name.toLowerCase();
      return name.includes('male') || 
             name.includes('david') || 
             name.includes('james') || 
             name.includes('george') || 
             name.includes('daniel') || 
             name.includes('google uk english male') ||
             name.includes('microsoft david') ||
             name.includes('jarvis') ||
             name.includes('guy') ||
             name.includes('natural');
    });

    let selectedVoice = maleVoices.find(v => v.name.includes('Google UK English Male')) ||
                        maleVoices.find(v => v.name.includes('David')) ||
                        maleVoices.find(v => v.name.includes('Microsoft David')) ||
                        maleVoices[0] ||
                        englishVoices.find(v => v.name.toLowerCase().includes('male')) ||
                        englishVoices[0] ||
                        voices[0];

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      setCurrentlySpeakingId(null);
    };

    utterance.onerror = () => {
      setCurrentlySpeakingId(null);
    };

    window.speechSynthesis.speak(utterance);
  };

  // Google Sheets Export state variables
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isExportingToSheets, setIsExportingToSheets] = useState(false);
  const [spreadsheetLink, setSpreadsheetLink] = useState<string | null>(null);
  const [exportSuccessOpen, setExportSuccessOpen] = useState(false);

  // Clear Data state variables
  const [showClearDataConfirmation, setShowClearDataConfirmation] = useState(false);

  // Change Password state variables
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleExportData = () => {
    const dataToExport = allWins.length > 0 ? allWins : wins;
    if (dataToExport.length === 0) {
      alert(language === 'ID' ? 'Tidak ada data kemenangan untuk diekspor.' : 'No winning data to export.');
      return;
    }

    const headers = [
      'ID',
      'Date (Local Time)',
      'Timestamp (ms)',
      'Description / Text',
      'Reflections',
      'Starred (Bintang)',
      'Pinned (Pin)',
      'Type (Mode)',
      'Tags',
      'BE (Identity Text)',
      'DO (Action Text)',
      'HAVE (Outcome Text)'
    ];

    const csvRows = [headers.join(',')];

    for (const win of dataToExport) {
      const dateObj = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
      const formattedDate = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleString();
      const rawTimestamp = isNaN(dateObj.getTime()) ? '' : dateObj.getTime().toString();
      
      let modeType = 'Standard';
      if (win.isHabitMode) modeType = 'Habit';
      else if (win.isBeDoHave) modeType = 'BE-DO-HAVE';

      const row = [
        win.id || '',
        formattedDate,
        rawTimestamp,
        win.text || '',
        win.reflections || '',
        win.starred ? 'Yes' : 'No',
        win.pinned ? 'Yes' : 'No',
        modeType,
        (win.tags || []).join('; '),
        win.beText || '',
        win.doText || '',
        win.haveText || ''
      ];

      const escapedRow = row.map(value => {
        const stringVal = String(value || '');
        const cleaned = stringVal.replace(/\r?\n|\r/g, ' ');
        const escaped = cleaned.replace(/"/g, '""');
        return `"${escaped}"`;
      });

      csvRows.push(escapedRow.join(','));
    }

    const csvString = "\ufeff" + csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const blobUrl = URL.createObjectURL(blob);
    
    const anchor = document.createElement('a');
    anchor.href = blobUrl;
    anchor.download = `wins_data_export_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(blobUrl);
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  };

  const loadSheetJS = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if ((window as any).XLSX) {
        resolve((window as any).XLSX);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      script.onload = () => {
        if ((window as any).XLSX) {
          resolve((window as any).XLSX);
        } else {
          reject(new Error('SheetJS loaded but XLSX object not found on window.'));
        }
      };
      script.onerror = () => {
        reject(new Error('Gagal mengunduh pustaka pembaca Excel. Periksa koneksi internet Anda.'));
      };
      document.head.appendChild(script);
    });
  };

  const handleImportExcelOrCSV = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      setLoggingIn(true);
      setError(null);
      try {
        const XLSX = await loadSheetJS();
        
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
            const data = e.target?.result;
            if (!data) return;
            
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (!rows || rows.length <= 1) {
              alert(language === 'ID' ? 'File Excel kosong atau tidak valid.' : 'Excel file is empty or invalid.');
              setLoggingIn(false);
              return;
            }
            
            const parsedEntries: any[] = [];
            const tagsToUpsert = new Set<string>();
            
            for (let i = 1; i < rows.length; i++) {
              const row = rows[i];
              if (!row || row.length === 0) continue;
              
              const textVal = row[3] ? String(row[3]).trim() : '';
              if (!textVal) continue;
              
              const idVal = row[0] ? String(row[0]).trim() : '';
              const reflectionsVal = row[4] ? String(row[4]).trim() : '';
              const starredVal = String(row[5] || '').toLowerCase() === 'yes';
              const pinnedVal = String(row[6] || '').toLowerCase() === 'yes';
              const modeType = row[7] ? String(row[7]).trim() : 'Standard';
              
              const rawTags = row[8] ? String(row[8]) : '';
              const tagsVal = rawTags ? rawTags.split(';').map((t: string) => t.trim()).filter(Boolean) : [];
              
              const beTextVal = row[9] ? String(row[9]).trim() : '';
              const doTextVal = row[10] ? String(row[10]).trim() : '';
              const haveTextVal = row[11] ? String(row[11]).trim() : '';
              
              let createdAtMillis = Date.now();
              const timestampVal = row[2] ? Number(row[2]) : NaN;
              if (!isNaN(timestampVal)) {
                createdAtMillis = timestampVal;
              } else if (row[1]) {
                const parsedDate = new Date(row[1]);
                if (!isNaN(parsedDate.getTime())) {
                  createdAtMillis = parsedDate.getTime();
                }
              }
              
              const winId = idVal ? idVal : 'win_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
              const isHabit = modeType === 'Habit';
              const isBeDoHave = modeType === 'BE-DO-HAVE';
              
              parsedEntries.push({
                id: winId,
                user_id: user.uid,
                text: textVal,
                reflections: reflectionsVal,
                starred: starredVal,
                pinned: pinnedVal,
                is_habit_mode: isHabit,
                is_be_do_have: isBeDoHave,
                tags: tagsVal,
                be_text: beTextVal,
                do_text: doTextVal,
                have_text: haveTextVal,
                created_at: new Date(createdAtMillis).toISOString()
              });
              
              tagsVal.forEach((t: string) => tagsToUpsert.add(t));
            }
            
            if (parsedEntries.length === 0) {
              alert(language === 'ID' ? 'Tidak ada data kemenangan valid yang ditemukan di file Excel.' : 'No valid winning data found in Excel.');
              setLoggingIn(false);
              return;
            }
            
            let successCount = 0;
            for (const entry of parsedEntries) {
              const { error: upsertErr } = await supabase.from('wins').upsert(entry);
              if (upsertErr) {
                console.error("Failed to import win from Excel:", entry, upsertErr);
              } else {
                successCount++;
              }
            }
            
            for (const tagName of Array.from(tagsToUpsert)) {
              const sanitizedTagName = tagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
              if (!sanitizedTagName) continue;
              const tagId = `${user.uid}_${sanitizedTagName}`;
              const { error: tagErr } = await supabase.from('tags').upsert({
                id: tagId,
                name: tagName,
                user_id: user.uid,
                count: 1
              });
              if (tagErr) {
                console.error("Failed to upsert tag during Excel import:", tagName, tagErr);
              }
            }
            
            setLoggingIn(false);
            alert(language === 'ID' 
              ? `Impor selesai! Berhasil memasukkan/memperbarui ${successCount} dari ${parsedEntries.length} entri kemenangan dari file Excel.` 
              : `Import completed! Successfully inserted/updated ${successCount} of ${parsedEntries.length} winning entries from Excel.`);
            
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 3000);
            
          } catch (err: any) {
            console.error("Excel processing error:", err);
            setLoggingIn(false);
            alert(language === 'ID' ? `Gagal mengurai file Excel: ${err.message || err}` : `Failed to parse Excel file: ${err.message || err}`);
          }
        };
        reader.readAsArrayBuffer(file);
      } catch (err: any) {
        console.error("SheetJS loading error:", err);
        setLoggingIn(false);
        setError(err.message || 'Gagal memuat pustaka pembaca Excel.');
      }
    } else {
      // Handle CSV file
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const text = e.target?.result as string;
          if (!text) return;

          const lines = text.split(/\r?\n/);
          if (lines.length <= 1) {
            alert(language === 'ID' ? 'File CSV kosong atau tidak valid.' : 'CSV file is empty or invalid.');
            return;
          }

          const parsedEntries: any[] = [];
          const tagsToUpsert = new Set<string>();

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            const columns = parseCSVLine(line);
            if (columns.length < 4) continue;

            const textVal = columns[3]?.trim();
            if (!textVal) continue;

            const reflectionsVal = columns[4] || '';
            const starredVal = (columns[5] || '').toLowerCase() === 'yes';
            const pinnedVal = (columns[6] || '').toLowerCase() === 'yes';
            const modeType = columns[7] || 'Standard';
            const tagsVal = columns[8] ? columns[8].split(';').map(t => t.trim()).filter(Boolean) : [];
            const beTextVal = columns[9] || '';
            const doTextVal = columns[10] || '';
            const haveTextVal = columns[11] || '';

            let createdAtMillis = Date.now();
            const timestampVal = columns[2] ? Number(columns[2]) : NaN;
            if (!isNaN(timestampVal)) {
              createdAtMillis = timestampVal;
            } else if (columns[1]) {
              const parsedDate = new Date(columns[1]);
              if (!isNaN(parsedDate.getTime())) {
                createdAtMillis = parsedDate.getTime();
              }
            }

            const winId = columns[0] ? columns[0].trim() : 'win_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
            const isHabit = modeType === 'Habit';
            const isBeDoHave = modeType === 'BE-DO-HAVE';

            parsedEntries.push({
              id: winId,
              user_id: user.uid,
              text: textVal,
              reflections: reflectionsVal,
              starred: starredVal,
              pinned: pinnedVal,
              is_habit_mode: isHabit,
              is_be_do_have: isBeDoHave,
              tags: tagsVal,
              be_text: beTextVal,
              do_text: doTextVal,
              have_text: haveTextVal,
              created_at: new Date(createdAtMillis).toISOString()
            });

            tagsVal.forEach(t => tagsToUpsert.add(t));
          }

          if (parsedEntries.length === 0) {
            alert(language === 'ID' ? 'Tidak ada data kemenangan valid yang ditemukan di CSV.' : 'No valid winning data found in CSV.');
            return;
          }

          setLoggingIn(true);

          let successCount = 0;
          for (const entry of parsedEntries) {
            const { error: upsertErr } = await supabase.from('wins').upsert(entry);
            if (upsertErr) {
              console.error("Failed to import win:", entry, upsertErr);
            } else {
              successCount++;
            }
          }

          for (const tagName of Array.from(tagsToUpsert)) {
            const sanitizedTagName = tagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
            if (!sanitizedTagName) continue;
            const tagId = `${user.uid}_${sanitizedTagName}`;
            const { error: tagErr } = await supabase.from('tags').upsert({
              id: tagId,
              name: tagName,
              user_id: user.uid,
              count: 1
            });
            if (tagErr) {
              console.error("Failed to upsert tag during import:", tagName, tagErr);
            }
          }

          setLoggingIn(false);
          alert(language === 'ID' 
            ? `Impor selesai! Berhasil memasukkan/memperbarui ${successCount} dari ${parsedEntries.length} entri kemenangan.` 
            : `Import completed! Successfully inserted/updated ${successCount} of ${parsedEntries.length} winning entries.`);
          
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 3000);

        } catch (err) {
          console.error("CSV Import Error:", err);
          setLoggingIn(false);
          alert(language === 'ID' ? 'Gagal memproses file CSV.' : 'Failed to process CSV file.');
        }
      };
      reader.readAsText(file);
    }
    event.target.value = '';
  };

  const exportToGoogleSheets = async () => {
    setIsExportingToSheets(true);
    try {
      let token = googleAccessToken;
      if (!token) {
        const provider = new GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/spreadsheets');
        provider.addScope('https://www.googleapis.com/auth/drive.file');
        
        const result = await signInWithPopup(auth, provider);
        const credential = GoogleAuthProvider.credentialFromResult(result);
        if (!credential?.accessToken) {
          throw new Error('Failed to retrieve Google API access token.');
        }
        token = credential.accessToken;
        setGoogleAccessToken(token);
      }

      const dataToExport = allWins.length > 0 ? allWins : wins;
      if (dataToExport.length === 0) {
        alert(language === 'ID' ? 'Tidak ada data kemenangan untuk diekspor.' : 'No winning data to export.');
        return;
      }

      // 1. Column headers and row structures
      const headers = [
        'ID',
        'Date (Local Time)',
        'Timestamp (ms)',
        'Description / Text',
        'Reflections',
        'Starred (Bintang)',
        'Pinned (Pin)',
        'Type (Mode)',
        'Tags',
        'BE (Identity Text)',
        'DO (Action Text)',
        'HAVE (Outcome Text)'
      ];

      const rows = [headers];

      for (const win of dataToExport) {
        const dateObj = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
        const formattedDate = isNaN(dateObj.getTime()) ? '' : dateObj.toLocaleString();
        const rawTimestamp = isNaN(dateObj.getTime()) ? '' : dateObj.getTime().toString();
        
        let modeType = 'Standard';
        if (win.isHabitMode) modeType = 'Habit';
        else if (win.isBeDoHave) modeType = 'BE-DO-HAVE';

        rows.push([
          win.id || '',
          formattedDate,
          rawTimestamp,
          win.text || '',
          win.reflections || '',
          win.starred ? 'Yes' : 'No',
          win.pinned ? 'Yes' : 'No',
          modeType,
          (win.tags || []).join('; '),
          win.beText || '',
          win.doText || '',
          win.haveText || ''
        ]);
      }

      // 2. Create spreadsheet on user's My Drive via API
      const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Streak Wins Export - ${new Date().toLocaleDateString()}`
          }
        })
      });

      if (!createRes.ok) {
        const errorData = await createRes.json();
        throw new Error(`Google Sheets creation failed: ${errorData.error?.message || createRes.statusText}`);
      }

      const sheetMeta = await createRes.json();
      const spreadsheetId = sheetMeta.spreadsheetId;
      const spreadsheetUrl = sheetMeta.spreadsheetUrl;

      // 3. Populate sheet with rows of data
      const updateRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: "Sheet1!A1",
          majorDimension: "ROWS",
          values: rows
        })
      });

      if (!updateRes.ok) {
        const errorData = await updateRes.json();
        throw new Error(`Failed to write values into Google Sheet: ${errorData.error?.message || updateRes.statusText}`);
      }

      // 4. Set links and open model popups
      setSpreadsheetLink(spreadsheetUrl);
      setExportSuccessOpen(true);
    } catch (error: any) {
      console.error("Google Sheets Export Error:", error);
      if (error?.code !== 'auth/popup-closed-by-user') {
        alert(language === 'ID'
          ? `Ekspor ke Google Sheets gagal: ${error.message || error}`
          : `Google Sheets export failed: ${error.message || error}`
        );
      }
    } finally {
      setIsExportingToSheets(false);
    }
  };



  const handleClearAllData = async () => {
    if (!user) return;
    
    setLoggingIn(true);
    setError(null);
    try {
      // 1. Delete wins
      const { error: winsErr } = await supabase.from('wins').delete().eq('user_id', user.uid);
      if (winsErr) throw winsErr;

      // 2. Delete tags
      const { error: tagsErr } = await supabase.from('tags').delete().eq('user_id', user.uid);
      if (tagsErr) throw tagsErr;

      // 3. Delete settings
      const { error: settingsErr } = await supabase.from('settings').delete().eq('user_id', user.uid);
      if (settingsErr) throw settingsErr;

      // 4. Delete chat stars
      const { error: chatErr } = await supabase.from('chat_stars').delete().eq('user_id', user.uid);
      if (chatErr) throw chatErr;

      // 5. Delete token logs
      const { error: tokenErr } = await supabase.from('token_logs').delete().eq('user_id', user.uid);
      if (tokenErr) throw tokenErr;

      alert(language === 'ID' ? 'Semua data kemenangan Anda telah berhasil dihapus.' : 'All your winning data has been successfully deleted.');
      setShowClearDataConfirmation(false);

      // Reset local state variables to reflect empty state instantly
      setDraftEntries([{ id: Math.random().toString(36).substr(2, 9), text: '', reflections: '', tags: [], starred: false, pinned: false }]);
      setOriginalEntries([]);
      setWins([]);
      setAllWins([]);
      
    } catch (err: any) {
      console.error("Clear all data error:", err);
      setError(language === 'ID' 
        ? `Gagal menghapus data: ${err.message || err}`
        : `Failed to delete data: ${err.message || err}`);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPasswordInput || !confirmPasswordInput) return;

    if (newPasswordInput.length < 6) {
      setPasswordError(language === 'ID' ? 'Password baru minimal 6 karakter.' : 'New password must be at least 6 characters.');
      return;
    }

    if (newPasswordInput !== confirmPasswordInput) {
      setPasswordError(language === 'ID' ? 'Konfirmasi password tidak cocok.' : 'Confirm password does not match.');
      return;
    }

    setIsUpdatingPassword(true);
    setPasswordError(null);
    setPasswordSuccess(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasswordInput
      });

      if (error) throw error;

      setPasswordSuccess(language === 'ID' ? 'Password Anda berhasil diperbarui.' : 'Your password has been successfully updated.');
      setNewPasswordInput('');
      setConfirmPasswordInput('');
      setTimeout(() => {
        setShowChangePasswordModal(false);
        setPasswordSuccess(null);
      }, 2000);

    } catch (err: any) {
      console.error("Change password error:", err);
      setPasswordError(err.message || (language === 'ID' ? 'Gagal memperbarui password.' : 'Failed to update password.'));
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Fetch all wins for stats when in profile
  useEffect(() => {
    if (activeView === 'profile' && user && allWins.length === 0) {
      const fetchAll = async () => {
        setFetchingAll(true);
        try {
          const { data, error } = await supabase
            .from('wins')
            .select('*')
            .eq('user_id', user.uid)
            .order('created_at', { ascending: false });
          if (error) throw error;
          const list = (data || []).map(row => ({
            id: row.id,
            text: row.text,
            tags: row.tags || [],
            userId: row.user_id,
            createdAt: new Date(row.created_at).getTime(),
            starred: row.starred,
            pinned: row.pinned,
            isHabitMode: row.is_habit_mode,
            isBeDoHave: row.is_be_do_have,
            beText: row.be_text,
            doText: row.do_text,
            haveText: row.have_text,
            imageUrl: row.image_url || undefined,
            reflections: row.reflections || ''
          })) as Win[];
          setAllWins(list);
        } catch (e) {
          console.error(e);
        } finally {
          setFetchingAll(false);
        }
      };
      fetchAll();
    }
  }, [activeView, user, allWins.length]);

  const habitStats = useMemo(() => {
    // Use allWins if available, otherwise fallback to recent wins
    const sourceWins = allWins.length > 0 ? allWins : wins;
    const stats: { 
      [habitName: string]: { 
        count: number, 
        streak: number, 
        history: boolean[] 
      } 
    } = {};

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    templates.forEach(habit => {
      const habitWins = sourceWins
        .filter(w => w.isHabitMode && w.text === habit)
        .sort((a, b) => b.createdAt - a.createdAt);

      const count = habitWins.length;
      let streak = 0;
      
      const winDates = new Set(habitWins.map(w => {
        const d = new Date(w.createdAt);
        d.setHours(0,0,0,0);
        return d.toDateString();
      }));

      const doneToday = winDates.has(now.toDateString());
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const doneYesterday = winDates.has(yesterday.toDateString());

      if (doneToday || doneYesterday) {
        let current = doneToday ? new Date(now) : new Date(yesterday);
        while (winDates.has(current.toDateString())) {
          streak++;
          current.setDate(current.getDate() - 1);
        }
      }

      const history: boolean[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        history.push(winDates.has(d.toDateString()));
      }

      stats[habit] = { count, streak, history };
    });

    return stats;
  }, [wins, templates, allWins]);

  const weeklyHabitData = useMemo(() => {
    const sourceWins = allWins.length > 0 ? allWins : wins;
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return { 
        name: d.toLocaleDateString('en-US', { weekday: 'short' }),
        count: 0,
        fullDate: d.toDateString()
      };
    });

    sourceWins.forEach(win => {
      if (win.isHabitMode && win.createdAt) {
        const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
        if (isNaN(d.getTime())) return;
        const winDate = new Date(d);
        winDate.setHours(0,0,0,0);
        const winDateStr = winDate.toDateString();
        const dayData = last7Days.find(d => d.fullDate === winDateStr);
        if (dayData) {
          dayData.count += 1;
        }
      }
    });

    return last7Days;
  }, [wins, allWins]);
  const [searchQuery, setSearchQuery] = useState('');
  const [queryEmbedding, setQueryEmbedding] = useState<number[] | null>(null);
  const [isSearchingSemantically, setIsSearchingSemantically] = useState(false);

  const cosineSimilarity = (vecA: number[], vecB: number[]) => {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
    let dotProduct = 0;
    let magA = 0;
    let magB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        magA += vecA[i] * vecA[i];
        magB += vecB[i] * vecB[i];
    }
    magA = Math.sqrt(magA);
    magB = Math.sqrt(magB);
    if (magA === 0 || magB === 0) return 0;
    return dotProduct / (magA * magB);
  };
  const [starredOnly, setStarredOnly] = useState(false);
  const [pinnedOnly, setPinnedOnly] = useState(false);
  const [statsSubView, setStatsSubView] = useState<'stats' | 'tags'>('stats');
  const [editingTag, setEditingTag] = useState<{ id: string, name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmDeleteEntryId, setConfirmDeleteEntryId] = useState<string | null>(null);
  const [confirmDeleteTemplateIndex, setConfirmDeleteTemplateIndex] = useState<number | null>(null);
  const [focusedEntryId, setFocusedEntryId] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<{ 
    role: 'user' | 'model'; 
    parts: { text: string }[];
    usage?: { promptTokenCount?: number; candidatesTokenCount?: number; totalTokenCount?: number };
  }[]>([]);
  const [chatStars, setChatStars] = useState<any[]>([]);
  const [isChatting, setIsChatting] = useState(false);
  const groupedStars = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    chatStars.forEach(star => {
      const locale = language === 'ID' ? 'id-ID' : 'en-US';
      
      let dateVal = Date.now();
      if (star.createdAt) {
        if (typeof star.createdAt === 'number') {
          dateVal = star.createdAt;
        } else if (typeof star.createdAt === 'object' && star.createdAt.seconds) {
          dateVal = star.createdAt.seconds * 1000;
        } else if (typeof star.createdAt === 'string') {
          const parsed = new Date(star.createdAt).getTime();
          if (!isNaN(parsed)) dateVal = parsed;
        }
      }

      const date = new Date(dateVal).toLocaleDateString(locale, { 
        day: 'numeric', 
        month: 'short', 
        year: 'numeric' 
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(star);
    });
    return groups;
  }, [chatStars, language]);

  const [isStarDropdownOpen, setIsStarDropdownOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    try {
      return (localStorage.getItem('streak_theme') as 'light' | 'dark') || 'light';
    } catch {
      return 'light';
    }
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    try {
      localStorage.setItem('streak_theme', theme);
    } catch {}
  }, [theme]);

  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return dayOfYear % 10;
  });

  const pinnedQuotes = useMemo(() => {
    const pinned = wins.filter(w => w.pinned);
    return [...pinned]
      .sort(() => Math.random() - 0.5)
      .slice(0, 10)
      .map(p => ({ text: p.text, author: "My Pinned Win" }));
  }, [wins]);

  const displayQuote = useMemo(() => {
    if (pinnedQuotes.length > 0) {
      return pinnedQuotes[currentQuoteIndex % pinnedQuotes.length];
    }
    return QUOTES[currentQuoteIndex % QUOTES.length];
  }, [pinnedQuotes, currentQuoteIndex]);

  // Auto-advance quotes every 10 seconds only when on home view
  useEffect(() => {
    if (activeView !== 'home') return;
    
    const length = pinnedQuotes.length > 0 ? pinnedQuotes.length : QUOTES.length;
    
    const timer = setInterval(() => {
      setCurrentQuoteIndex(prev => (prev + 1) % length);
    }, 10000);
    return () => clearInterval(timer);
  }, [activeView, pinnedQuotes.length]);
  
  // New States for Recording
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [viewBaseDate, setViewBaseDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const selectedDateTime = selectedDate.getTime();
  const [draftEntries, setDraftEntries] = useState<DraftEntry[]>([]);
  const [originalEntries, setOriginalEntries] = useState<DraftEntry[]>([]);
  const [isJustSaved, setIsJustSaved] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [tagInput, setTagInput] = useState<{ [entryId: string]: string }>({});
  const [isHabitsExpanded, setIsHabitsExpanded] = useState<boolean>(true);
  const [recordFilter, setRecordFilter] = useState<'all' | 'habit' | 'entry' | 'bedohave'>('all');
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());

  // Keyboard Shortcuts for Habits (1-9)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (activeView !== 'record') return;
      
      const target = e.target as HTMLElement;
      if (target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable) return;

      const num = parseInt(e.key);
      if (isNaN(num) || num < 1 || num > 9) return;

      const entryToUpdate = draftEntries.find(ent => ent.id === focusedEntryId && ent.isHabitMode) 
                         || draftEntries.find(ent => ent.isHabitMode);

      if (entryToUpdate && templates[num - 1]) {
        updateDraftEntry(entryToUpdate.id, { text: templates[num - 1] });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeView, draftEntries, focusedEntryId, templates]);

  const lastLoadedDateRef = useRef<string | null>(null);

  // Sync Record View with Selected Date
  useEffect(() => {
    if (activeView !== 'record') return;

    const dateKey = selectedDate.toDateString();
    const isDateChanged = lastLoadedDateRef.current !== dateKey;
    lastLoadedDateRef.current = dateKey;

    const existingForDate = (winsByDate[dateKey] || [])
      .map(w => ({
        id: w.id,
        text: w.text,
        tags: w.tags || [],
        starred: !!w.starred,
        pinned: !!w.pinned,
        isHabitMode: !!w.isHabitMode,
        isBeDoHave: !!w.isBeDoHave,
        beText: w.beText || "",
        doText: w.doText || "",
        haveText: w.haveText || "",
        imageUrl: w.imageUrl,
        reflections: w.reflections || "",
        createdAt: w.createdAt
      }))
      .sort((a, b) => {
        const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
        const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
        return timeB - timeA;
      });

    // Identify if the current draft has already-saved entries (non-new IDs)
    const hasSavedEntriesInDraft = draftEntries.some(e => !e.id.startsWith('new_'));
    const hasUnsavedContent = draftEntries.some(e => e.id.startsWith('new_') && e.text.trim().length > 0);

    if (existingForDate.length > 0) {
      // Sync from database if we have records
      // We use JSON stringify to avoid infinite update loops if the content is functionally identical
      if (isDateChanged || JSON.stringify(existingForDate) !== JSON.stringify(originalEntries)) {
        setDraftEntries(existingForDate);
        setOriginalEntries(JSON.parse(JSON.stringify(existingForDate)));
      }
    } else {
      // Only reset to an empty draft if:
      // - The date has changed (switching to a new date with no entries)
      // - OR we have saved entries in the draft from a previous date but the database for this date is empty.
      if (isDateChanged || (hasSavedEntriesInDraft && !hasUnsavedContent)) {
        const newId = `new_${Math.random().toString(36).substr(2, 9)}`;
        const emptyDraft = [{ id: newId, text: '', tags: [], reflections: '', starred: false, pinned: false }];
        setDraftEntries(emptyDraft);
        setOriginalEntries(JSON.parse(JSON.stringify(emptyDraft)));
      }
    }
  }, [selectedDateTime, activeView, winsByDate]); // Depend on winsByDate for proper sync

  const hasChanges = useMemo(() => {
    if (draftEntries.length !== originalEntries.length) return true;
    for (let i = 0; i < draftEntries.length; i++) {
      const draft = draftEntries[i];
      const original = originalEntries.find(o => o.id === draft.id);
      if (!original) return true; // It's a new entry
      if (draft.text !== original.text) return true;
      if (draft.starred !== original.starred) return true;
      if (draft.pinned !== original.pinned) return true;
      if (draft.imageUrl !== original.imageUrl) return true;
      if (JSON.stringify(draft.tags) !== JSON.stringify(original.tags)) return true;
    }
    return false;
  }, [draftEntries, originalEntries]);

  // Semantic Search Effect
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 2) {
        setIsSearchingSemantically(true);
        const emb = await getEmbedding(searchQuery);
        setQueryEmbedding(emb);
        setIsSearchingSemantically(false);
      } else {
        setQueryEmbedding(null);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Auth Listener
  useEffect(() => {
    let authTimeout: any;
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (authTimeout) clearTimeout(authTimeout);
      if (session?.user) {
        const u = session.user;
        setUser({
          uid: u.id,
          email: u.email || "",
          displayName: u.user_metadata?.display_name || u.user_metadata?.username || "",
          photoURL: u.user_metadata?.avatar_url || null
        } as any);
        try {
          localStorage.setItem('streak_auth_hint', 'true');
        } catch {}
      } else {
        setUser(null);
        try {
          localStorage.removeItem('streak_auth_hint');
        } catch {}
      }
      setLoading(false);
    }).catch(err => {
      console.error("Auth session check error:", err);
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (authTimeout) clearTimeout(authTimeout);
      if (session?.user) {
        const u = session.user;
        setUser({
          uid: u.id,
          email: u.email || "",
          displayName: u.user_metadata?.display_name || u.user_metadata?.username || "",
          photoURL: u.user_metadata?.avatar_url || null
        } as any);
        try {
          localStorage.setItem('streak_auth_hint', 'true');
        } catch {}
      } else {
        setUser(null);
        try {
          localStorage.removeItem('streak_auth_hint');
        } catch {}
      }
      setLoading(false);
    });

    // Safety timeout: if auth doesn't respond in 8 seconds, force stop loading
    authTimeout = setTimeout(() => {
      setLoading((prev) => {
        if (prev) {
          console.warn("Auth initialization timed out after 8s");
          return false;
        }
        return prev;
      });
    }, 8000);

    return () => {
      if (authTimeout) clearTimeout(authTimeout);
      subscription.unsubscribe();
    };
  }, []);

  // ==========================================
  // Supabase Data Fetchers & Realtime Listeners
  // ==========================================

  // 1. Wins Listener
  useEffect(() => {
    if (!user) {
      setWins([]);
      setAllWins([]);
      return;
    }

    const fetchWins = async () => {
      try {
        const { data, error } = await supabase
          .from('wins')
          .select('*')
          .eq('user_id', user.uid);
        if (error) throw error;

        const winsData = (data || []).map(row => ({
          id: row.id,
          text: row.text || '',
          tags: Array.isArray(row.tags) ? row.tags : [],
          userId: row.user_id || '',
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
          starred: !!row.starred,
          pinned: !!row.pinned,
          isHabitMode: !!row.is_habit_mode,
          isBeDoHave: !!row.is_be_do_have,
          beText: row.be_text || '',
          doText: row.do_text || '',
          haveText: row.have_text || '',
          imageUrl: row.image_url || null,
          reflections: row.reflections || '',
          embedding: row.embedding || null
        }));

        winsData.sort((a, b) => b.createdAt - a.createdAt);
        setWins(winsData);
        setAllWins(winsData);
      } catch (err) {
        console.error("Supabase Wins Fetch Err:", err);
      }
    };

    fetchWins();

    let debounceTimeout: any = null;

    const channel = supabase
      .channel(`wins_${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'wins', filter: `user_id=eq.${user.uid}` },
        () => {
          if (debounceTimeout) clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            fetchWins();
          }, 800); // Debounce to allow batch updates to finish
        }
      )
      .subscribe();

    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 2. Chat Stars Listener
  useEffect(() => {
    if (!user) {
      setChatStars([]);
      return;
    }

    const fetchChatStars = async () => {
      try {
        const { data, error } = await supabase
          .from('chat_stars')
          .select('*')
          .eq('user_id', user.uid);
        if (error) throw error;

        const starred = (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          userPrompt: row.user_prompt,
          aiResponse: row.ai_response,
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
        }));
        starred.sort((a, b) => b.createdAt - a.createdAt);
        setChatStars(starred);
      } catch (err) {
        console.error("Supabase Chat Stars Fetch Err:", err);
      }
    };

    fetchChatStars();

    const channel = supabase
      .channel(`chat_stars_${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_stars', filter: `user_id=eq.${user.uid}` },
        () => {
          fetchChatStars();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 3. Token Logs Listener
  useEffect(() => {
    if (!user) {
      setTokenLogs([]);
      return;
    }

    const fetchTokenLogs = async () => {
      try {
        const { data, error } = await supabase
          .from('token_logs')
          .select('*')
          .eq('user_id', user.uid);
        if (error) throw error;

        const logs = (data || []).map(row => ({
          id: row.id,
          functionName: row.function_name || '',
          inputTokens: Number(row.input_tokens || 0),
          outputTokens: Number(row.output_tokens || 0),
          createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now()
        }));
        logs.sort((a, b) => b.createdAt - a.createdAt);
        setTokenLogs(logs);
      } catch (err) {
        console.error("Supabase Token Logs Fetch Err:", err);
      }
    };

    fetchTokenLogs();

    const channel = supabase
      .channel(`token_logs_${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'token_logs', filter: `user_id=eq.${user.uid}` },
        () => {
          fetchTokenLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 4. Tags Listener
  useEffect(() => {
    if (!user) {
      setRegisteredTags([]);
      return;
    }

    const fetchTags = async () => {
      try {
        const { data, error } = await supabase
          .from('tags')
          .select('*')
          .eq('user_id', user.uid);
        if (error) throw error;

        const tagsData = (data || []).map(row => ({
          id: row.id,
          name: row.name || '',
          userId: row.user_id || '',
          color: row.color || 'bg-primary'
        }));
        setRegisteredTags(tagsData);
      } catch (err) {
        console.error("Supabase Tags Fetch Err:", err);
      }
    };

    fetchTags();

    const channel = supabase
      .channel(`tags_${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tags', filter: `user_id=eq.${user.uid}` },
        () => {
          fetchTags();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 5. Settings / Templates Listener
  useEffect(() => {
    if (!user) {
      setTemplates([]);
      return;
    }

    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('settings')
          .select('*')
          .eq('user_id', user.uid)
          .maybeSingle();
        if (error) throw error;

        if (data) {
          setTemplates(data.templates || []);
          setAiMemory(data.ai_memory || '');
        } else {
          setTemplates([]);
          setAiMemory('');
        }
      } catch (err) {
        console.error("Supabase Settings Fetch Err:", err);
      }
    };

    fetchSettings();

    const channel = supabase
      .channel(`settings_${user.uid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings', filter: `user_id=eq.${user.uid}` },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const streakData = useMemo(() => {
    if (wins.length === 0) return { current: 0, daysWithWins: new Set<string>() };
    
    const daysWithWins = new Set<string>();
    wins.forEach(win => {
      if (!win || !win.createdAt) return;
      const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
      if (isNaN(d.getTime())) return;
      daysWithWins.add(d.toDateString());
    });
    
    const sortedUniqueDays = Array.from(daysWithWins)
      .map(d => new Date(d).getTime())
      .sort((a, b) => b - a);
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(todayTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    const latestWinTime = sortedUniqueDays[0];
    if (latestWinTime && (latestWinTime >= todayTime || latestWinTime === yesterdayTime)) {
      currentStreak = 1;
      const oneDayMs = 86400000;
      for (let i = 0; i < sortedUniqueDays.length - 1; i++) {
        const current = sortedUniqueDays[i];
        const next = sortedUniqueDays[i+1];
        if (Math.abs(current - next) <= oneDayMs + 3600000) { // +1 hour for DST safety
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return { current: currentStreak, daysWithWins };
  }, [wins]);

  const streakCount = streakData.current;

  const beDoHaveStreakData = useMemo(() => {
    const beDoHaveWins = wins.filter(win => win && win.isBeDoHave);
    if (beDoHaveWins.length === 0) return { current: 0, daysWithWins: new Set<string>() };
    
    const daysWithWins = new Set<string>();
    beDoHaveWins.forEach(win => {
      if (!win || !win.createdAt) return;
      const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
      if (isNaN(d.getTime())) return;
      daysWithWins.add(d.toDateString());
    });
    
    const sortedUniqueDays = Array.from(daysWithWins)
      .map(d => new Date(d).getTime())
      .sort((a, b) => b - a);
    
    let currentStreak = 0;
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(todayTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    const latestWinTime = sortedUniqueDays[0];
    if (latestWinTime && (latestWinTime >= todayTime || latestWinTime === yesterdayTime)) {
      currentStreak = 1;
      const oneDayMs = 86400000;
      for (let i = 0; i < sortedUniqueDays.length - 1; i++) {
        const current = sortedUniqueDays[i];
        const next = sortedUniqueDays[i+1];
        if (Math.abs(current - next) <= oneDayMs + 3600000) { // +1 hour for DST safety
          currentStreak++;
        } else {
          break;
        }
      }
    }
    
    return { current: currentStreak, daysWithWins };
  }, [wins]);

  const beDoHaveStreakCount = beDoHaveStreakData.current;
  const totalBeDoHaveCount = useMemo(() => wins.filter(w => w.isBeDoHave).length, [wins]);

  const beDoHaveWeeklyMomentum = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Show today and the last 5 days = total 6 days
    for (let i = 5; i >= 0; i--) {
      const dayDate = new Date(today);
      dayDate.setDate(today.getDate() - i);
      const dayName = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'][dayDate.getDay()];
      const dayOfMonth = dayDate.getDate();
      const hasWin = beDoHaveStreakData.daysWithWins.has(dayDate.toDateString());
      const isToday = i === 0;
      
      days.push({ name: dayName, date: dayOfMonth, hasWin, isFuture: false, isToday });
    }
    return days;
  }, [beDoHaveStreakData]);

  const currentMasterHabit = useMemo(() => {
    if (selectedMasterHabit && templates.includes(selectedMasterHabit)) {
      return selectedMasterHabit;
    }
    return templates.length > 0 ? templates[0] : null;
  }, [selectedMasterHabit, templates]);

  const masterHabitStreakData = useMemo(() => {
    if (!currentMasterHabit) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        daysWithWins: new Map<string, number>(),
        streakDates: new Set<string>(),
        grid: []
      };
    }

    const sourceWins = allWins.length > 0 ? allWins : wins;
    const habitWins = sourceWins.filter(w => w && w.isHabitMode && w.text === currentMasterHabit);

    const daysWithWins = new Map<string, number>();
    habitWins.forEach(win => {
      if (!win || !win.createdAt) return;
      const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
      if (isNaN(d.getTime())) return;
      const dateStr = d.toDateString();
      daysWithWins.set(dateStr, (daysWithWins.get(dateStr) || 0) + 1);
    });

    const sortedUniqueDays = Array.from(daysWithWins.keys())
      .map(d => new Date(d).getTime())
      .sort((a, b) => b - a);

    let currentStreak = 0;
    const streakDates = new Set<string>();
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayTime = today.getTime();
    
    const yesterday = new Date(todayTime);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayTime = yesterday.getTime();
    
    if (sortedUniqueDays.length > 0) {
      const latestWinTime = sortedUniqueDays[0];
      if (latestWinTime >= todayTime || latestWinTime === yesterdayTime) {
        currentStreak = 1;
        streakDates.add(new Date(latestWinTime).toDateString());
        const oneDayMs = 86400000;
        let currentCheck = latestWinTime;
        for (let i = 1; i < sortedUniqueDays.length; i++) {
          const next = sortedUniqueDays[i];
          if (Math.abs(currentCheck - next) <= oneDayMs + 3600000) {
            currentStreak++;
            streakDates.add(new Date(next).toDateString());
            currentCheck = next;
          } else {
            break;
          }
        }
      }
    }

    let longestStreak = 0;
    if (sortedUniqueDays.length > 0) {
      let tempStreak = 1;
      let maxStreak = 1;
      const oneDayMs = 86400000;
      for (let i = 0; i < sortedUniqueDays.length - 1; i++) {
        const current = sortedUniqueDays[i];
        const next = sortedUniqueDays[i+1];
        if (Math.abs(current - next) <= oneDayMs + 3600000) {
          tempStreak++;
          if (tempStreak > maxStreak) {
            maxStreak = tempStreak;
          }
        } else {
          tempStreak = 1;
        }
      }
      longestStreak = maxStreak;
    }

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    
    const startGridDate = new Date(startOfWeek);
    startGridDate.setDate(startOfWeek.getDate() - 15 * 7);

    const checkDate = new Date();
    checkDate.setHours(23, 59, 59, 999);

    const grid = [];
    for (let c = 0; c < 16; c++) {
      const weekDays = [];
      for (let r = 0; r < 7; r++) {
        const cellDate = new Date(startGridDate);
        cellDate.setDate(startGridDate.getDate() + c * 7 + r);
        cellDate.setHours(12, 0, 0, 0); // Avoid daylight savings timezone boundary shifts
        const dateStr = cellDate.toDateString();
        const count = daysWithWins.get(dateStr) || 0;
        const isFuture = cellDate.getTime() > checkDate.getTime();
        const belongsToCurrentStreak = streakDates.has(dateStr);
        weekDays.push({
          date: cellDate,
          dateStr,
          count,
          isFuture,
          belongsToCurrentStreak
        });
      }
      
      let monthLabel = '';
      if (c === 0) {
        monthLabel = startGridDate.toLocaleDateString('en-US', { month: 'short' });
      } else {
        const prevSunday = new Date(startGridDate);
        prevSunday.setDate(startGridDate.getDate() + (c - 1) * 7);
        const thisSunday = new Date(startGridDate);
        thisSunday.setDate(startGridDate.getDate() + c * 7);
        if (thisSunday.getMonth() !== prevSunday.getMonth()) {
          monthLabel = thisSunday.toLocaleDateString('en-US', { month: 'short' });
        }
      }

      grid.push({
        weekIndex: c,
        monthLabel,
        days: weekDays
      });
    }

    return {
      currentStreak,
      longestStreak: Math.max(longestStreak, currentStreak),
      daysWithWins,
      streakDates,
      grid
    };
  }, [currentMasterHabit, wins, allWins]);

  const monthlyCalendarCells = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    
    const firstDayDate = new Date(year, month, 1);
    const firstDayOfWeek = firstDayDate.getDay(); // 0 is Sunday, 1 is Monday, etc.
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const cells = [];
    
    // Padding for weeks
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(null);
    }
    
    // Days
    for (let d = 1; d <= totalDays; d++) {
      const cellDate = new Date(year, month, d);
      cellDate.setHours(12, 0, 0, 0);
      const dateStr = cellDate.toDateString();
      const count = masterHabitStreakData.daysWithWins.get(dateStr) || 0;
      
      const compareDate = new Date(year, month, d);
      compareDate.setHours(23, 59, 59, 999);
      const isFuture = compareDate.getTime() > new Date().getTime();
      const belongsToCurrentStreak = masterHabitStreakData.streakDates.has(dateStr);
      
      cells.push({
        dayNum: d,
        date: cellDate,
        dateStr,
        count,
        isFuture,
        belongsToCurrentStreak,
        isToday: cellDate.toDateString() === new Date().toDateString()
      });
    }
    
    return cells;
  }, [calendarMonth, masterHabitStreakData]);

  const displayedDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(viewBaseDate);
      d.setDate(d.getDate() + (i - 3));
      d.setHours(0, 0, 0, 0);
      return d;
    });
  }, [viewBaseDate]);

  const activityData = useMemo(() => {
    const data = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    // Today and the last 7 days = 8 days
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;
      
      const count = wins.filter(win => {
        if (!win || !win.createdAt) return false;
        const wt = (win.createdAt as any).toDate ? (win.createdAt as any).toDate().getTime() : new Date(win.createdAt).getTime();
        return wt >= dayStart && wt < dayEnd;
      }).length;
      data.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        count,
        isToday: i === 0,
        dayOfMonth: d.getDate()
      });
    }
    return data;
  }, [wins]);

  const habitActivityData = useMemo(() => {
    const data = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = 7; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 86400000;
      
      const count = wins.filter(win => {
        if (!win || !win.createdAt || !win.isHabitMode) return false;
        const wt = (win.createdAt as any).toDate ? (win.createdAt as any).toDate().getTime() : new Date(win.createdAt).getTime();
        return wt >= dayStart && wt < dayEnd;
      }).length;
      data.push({
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        count,
        isToday: i === 0,
        dayOfMonth: d.getDate()
      });
    }
    return data;
  }, [wins]);

  const tagInsights = useMemo(() => {
    const counts: { [key: string]: number } = {};
    const refDate = new Date();
    refDate.setHours(0, 0, 0, 0);
    
    let startTime = 0;
    
    if (insightPeriod === 'week') {
      // Start of current calendar week (Monday)
      const day = refDate.getDay();
      const diff = day === 0 ? 6 : day - 1; // Distance from Monday
      const monday = new Date(refDate);
      monday.setDate(refDate.getDate() - diff);
      startTime = monday.getTime();
    } else if (insightPeriod === 'month') {
      // Start of current calendar month (1st)
      const startOfMonth = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
      startTime = startOfMonth.getTime();
    } else if (insightPeriod === 'year') {
      // Start of current calendar year (Jan 1st)
      const startOfYear = new Date(refDate.getFullYear(), 0, 1);
      startTime = startOfYear.getTime();
    }
    
    wins.forEach(win => {
      // Filter by period correctly using calendar-based startTime
      if (win.createdAt < startTime) return;
      
      if (win.tags && Array.isArray(win.tags)) {
        win.tags.forEach(tag => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    
    const entries = Object.entries(counts);
    if (entries.length === 0) return [];

    const maxCount = Math.max(...Object.values(counts), 1);
    
    const colors = ['bg-secondary', 'bg-tertiary', 'bg-primary', 'bg-orange-500', 'bg-rose-500'];

    return entries
      .map(([label, value], idx) => ({ 
        label, 
        value, 
        total: maxCount,
        color: colors[idx % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);
  }, [wins, insightPeriod]);

  const filteredWins = useMemo(() => {
    let result = [...wins];
    
    // Starred Filter
    if (starredOnly) {
      result = result.filter(win => win.starred);
    }

    // Pinned Filter
    if (pinnedOnly) {
      result = result.filter(win => win.pinned);
    }
    
    // Search Filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const isTagSearch = q.startsWith('#');
      
      if (queryEmbedding) {
        // Semantic Search: Score everything
        return result.map(win => ({
          ...win,
          similarity: win.embedding ? cosineSimilarity(queryEmbedding, win.embedding) : 0
        }))
        .filter(win => {
          // Keep if keyword matches OR similarity is high
          const winText = (win.text || '').toLowerCase();
          const winTags = (win.tags || []).map(t => t.toLowerCase());
          const keywordMatch = winText.includes(q.replace('#', '')) || winTags.some(tag => tag.includes(q.replace('#', '')));
          return keywordMatch || (win.similarity > 0.4);
        })
        .sort((a, b) => {
          const simA = (a as any).similarity || 0;
          const simB = (b as any).similarity || 0;
          return simB - simA;
        })
        .slice(0, 50);
      }

      result = result.filter(win => {
        const winText = (win.text || '').toLowerCase();
        const winTags = (win.tags || []).map(t => t.toLowerCase());
        
        if (isTagSearch) {
          // Exact tag match if it starts with #
          return winTags.includes(q);
        }
        
        // Fuzzy search text and tags
        const searchTerms = q.replace('#', '').split(' ').filter(Boolean);
        return searchTerms.every(term => 
          winText.includes(term) || winTags.some(tag => tag.includes(term))
        );
      });
    }
    
    // Default Sort (no query embedding)
    result.sort((a, b) => {
      const timeA = typeof a.createdAt === 'number' ? a.createdAt : 0;
      const timeB = typeof b.createdAt === 'number' ? b.createdAt : 0;
      return exploreSortOrder === 'desc' 
        ? timeB - timeA 
        : timeA - timeB;
    });

    return searchQuery.trim() ? result.slice(0, 50) : result.slice(0, 100);
  }, [wins, searchQuery, exploreSortOrder, starredOnly, pinnedOnly, queryEmbedding]);

  const topTags = useMemo(() => {
    const counts: { [key: string]: number } = {};
    wins.forEach(w => {
      if (w && w.tags && Array.isArray(w.tags)) {
        w.tags.forEach(t => counts[t] = (counts[t] || 0) + 1);
      }
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const max = sorted[0]?.[1] || 1;
    
    return sorted.map(([name, count]) => ({
      name,
      count,
      progress: (count / max) * 100
    }));
  }, [wins]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoggingIn(true);
    setError(null);
    
    if (!authEmail.trim() || !authPassword.trim()) {
      setError(language === 'ID' ? 'Email dan Password wajib diisi.' : 'Email and Password are required.');
      setLoggingIn(false);
      return;
    }
    
    if (authMode === 'register') {
      if (!authName.trim() || !authUsername.trim()) {
        setError(language === 'ID' ? 'Nama dan Username wajib diisi.' : 'Name and Username are required.');
        setLoggingIn(false);
        return;
      }
    }

    try {
      if (authMode === 'login') {
        const { error: loginErr } = await supabase.auth.signInWithPassword({
          email: authEmail.trim(),
          password: authPassword,
        });
        if (loginErr) throw loginErr;
      } else {
        const sanitizedUsername = authUsername.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: authEmail.trim(),
          password: authPassword,
          options: {
            data: {
              display_name: authName.trim(),
              username: sanitizedUsername,
            }
          }
        });
        if (signUpErr) throw signUpErr;
        
        if (data?.user && !data.session) {
          alert(language === 'ID' 
            ? 'Pendaftaran berhasil! Silakan periksa email Anda untuk memverifikasi akun.' 
            : 'Registration successful! Please check your email to verify your account.');
          setAuthMode('login');
        }
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      
      const serializeError = (e: any): string => {
        if (!e) return "Unknown error";
        if (typeof e === 'string') return e;
        
        const obj: any = {};
        Object.getOwnPropertyNames(e).forEach(key => {
          obj[key] = e[key];
        });
        
        Object.keys(e).forEach(key => {
          obj[key] = e[key];
        });
        
        try {
          return JSON.stringify(obj);
        } catch (err) {
          return e.toString ? e.toString() : String(e);
        }
      };
      
      setError(`Auth Error Detail: ${serializeError(err)}`);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      const { error: logErr } = await supabase.auth.signOut();
      if (logErr) throw logErr;
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  const handleAddTemplate = async () => {
    if (!newTemplate.trim() || !user) return;
    const originalTemplates = [...templates];
    const updated = [...templates, newTemplate.trim()];
    
    // Optimistic UI update: update local state immediately so the screen refreshes instantly
    setTemplates(updated);
    setNewTemplate('');
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ user_id: user.uid, templates: updated });
      if (error) throw error;
    } catch (error) {
      console.error("Error adding template:", error);
      setError("Failed to add template.");
      // Rollback state if database update fails
      setTemplates(originalTemplates);
    }
  };

  const handleRemoveTemplate = async (index: number) => {
    if (!user) return;
    const originalTemplates = [...templates];
    const updated = templates.filter((_, i) => i !== index);
    
    // Optimistic UI update: update local state immediately so the screen refreshes instantly
    setTemplates(updated);
    
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ user_id: user.uid, templates: updated });
      if (error) throw error;
    } catch (error) {
      console.error("Error removing template:", error);
      setError("Failed to remove template.");
      // Rollback state if database update fails
      setTemplates(originalTemplates);
    }
  };

  const handleEditTag = async (oldTagName: string, newTagName: string) => {
    if (!user || !newTagName.trim()) return;
    const formattedNewName = newTagName.startsWith('#') ? newTagName.toUpperCase() : `#${newTagName.toUpperCase()}`;
    if (formattedNewName === oldTagName) {
      setEditingTag(null);
      return;
    }

    try {
      // 1. Find all wins containing the old tag
      const winsToUpdate = wins.filter(w => w.tags.includes(oldTagName));
      
      // 2. Update each win
      if (winsToUpdate.length > 0) {
        for (const win of winsToUpdate) {
          const newTags = win.tags.map(t => t === oldTagName ? formattedNewName : t);
          const { error } = await supabase
            .from('wins')
            .update({ tags: newTags })
            .eq('id', win.id);
          if (error) throw error;
        }
      }

      // 3. Update/Create the new tag document
      const newTagId = `${user.uid}_${formattedNewName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const oldTagId = `${user.uid}_${oldTagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      
      const { error: insertErr } = await supabase
        .from('tags')
        .upsert({
          id: newTagId,
          name: formattedNewName,
          user_id: user.uid,
          count: (winsToUpdate.length || 1)
        });
      if (insertErr) throw insertErr;

      // 4. Delete the old tag document
      if (oldTagId !== newTagId) {
        const { error: deleteErr } = await supabase
          .from('tags')
          .delete()
          .eq('id', oldTagId);
        if (deleteErr) throw deleteErr;
      }

      // Update local state for wins and allWins
      setWins(prev => prev.map(w => {
        if (w.tags.includes(oldTagName)) {
          return { ...w, tags: w.tags.map(t => t === oldTagName ? formattedNewName : t) };
        }
        return w;
      }));
      setAllWins(prev => prev.map(w => {
        if (w.tags.includes(oldTagName)) {
          return { ...w, tags: w.tags.map(t => t === oldTagName ? formattedNewName : t) };
        }
        return w;
      }));

      setEditingTag(null);
    } catch (error) {
      console.error("Rename tag failed:", error);
      setError("Failed to rename tag. Please try again.");
    }
  };

  const handleDeleteTag = async (tagName: string) => {
    if (!user) return;
    
    try {
      // 1. Find all wins containing the tag
      const winsToUpdate = wins.filter(w => w.tags.includes(tagName));
      
      // 2. Remove the tag from each win
      if (winsToUpdate.length > 0) {
        for (const win of winsToUpdate) {
          const newTags = win.tags.filter(t => t !== tagName);
          const { error } = await supabase
            .from('wins')
            .update({ tags: newTags })
            .eq('id', win.id);
          if (error) throw error;
        }
      }

      // 3. Delete the tag document
      const tagId = `${user.uid}_${tagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '')}`;
      const { error: deleteErr } = await supabase
        .from('tags')
        .delete()
        .eq('id', tagId);
      if (deleteErr) throw deleteErr;

      // Update local state for wins and allWins
      setWins(prev => prev.map(w => {
        if (w.tags.includes(tagName)) {
          return { ...w, tags: w.tags.filter(t => t !== tagName) };
        }
        return w;
      }));
      setAllWins(prev => prev.map(w => {
        if (w.tags.includes(tagName)) {
          return { ...w, tags: w.tags.filter(t => t !== tagName) };
        }
        return w;
      }));

      setConfirmDelete(null);
    } catch (error) {
      console.error("Delete tag failed:", error);
      setError("Failed to delete tag. Please try again.");
    }
  };

  const addDraftEntry = (isHabitMode = false, isBeDoHave = false) => {
    setRecordFilter('all');
    setDraftEntries([
      { 
        id: `new_${Math.random().toString(36).substr(2, 9)}`, 
        text: '', 
        tags: isBeDoHave ? ['BEDOHAVE'] : [], 
        starred: false, 
        pinned: false,
        isHabitMode,
        isBeDoHave,
        beText: '',
        doText: '',
        haveText: '',
        createdAt: Date.now()
      },
      ...draftEntries
    ]);
  };

  const handleSaveSingleWin = async (entryId: string) => {
    if (!user) return;
    const entry = draftEntries.find(e => e.id === entryId);
    if (!entry || !entry.text.trim()) return;

    try {
      const isNew = entry.id.startsWith('new_');
      const winId = isNew ? 'win_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9) : entry.id;
      const original = originalEntries.find(o => o.id === entry.id);
      
      let finalTimestamp: string;
      if (isNew) {
        const now = new Date();
        const timestampDate = new Date(selectedDate);
        timestampDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
        finalTimestamp = timestampDate.toISOString();
      } else if (original?.createdAt) {
        finalTimestamp = new Date(original.createdAt).toISOString();
      } else {
        const fallbackDate = new Date(selectedDate);
        fallbackDate.setHours(12, 0, 0, 0);
        finalTimestamp = fallbackDate.toISOString();
      }

      let uniqueTags = Array.from(new Set<string>(entry.tags || []));
      if (entry.isBeDoHave && !uniqueTags.includes('BEDOHAVE')) {
        uniqueTags.push('BEDOHAVE');
      }
      
      let embedding: number[] | null = entry.embedding || null;
      const needsEmbeddingUpdate = !embedding || entry.text !== original?.text;

      const data = {
        id: winId,
        text: entry.text,
        tags: uniqueTags,
        user_id: user.uid,
        created_at: finalTimestamp,
        starred: !!entry.starred,
        pinned: !!entry.pinned,
        is_habit_mode: !!entry.isHabitMode,
        is_be_do_have: !!entry.isBeDoHave,
        be_text: entry.beText || "",
        do_text: entry.doText || "",
        have_text: entry.haveText || "",
        image_url: entry.imageUrl || null,
        embedding: embedding,
        reflections: entry.reflections || ""
      };

      const { error: winErr } = await supabase.from('wins').upsert(data);
      if (winErr) throw winErr;

      for (const tagName of uniqueTags) {
        const sanitizedTagName = tagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
        const tagId = `${user.uid}_${sanitizedTagName}`;
        const { error: tagErr } = await supabase.from('tags').upsert({
          id: tagId,
          name: tagName,
          user_id: user.uid,
          count: 1 
        });
        if (tagErr) throw tagErr;
      }
      
      // Trigger checkout/save victory celebration and confetti
      setIsJustSaved(true);
      setShowConfetti(true);
      setTimeout(() => {
        setIsJustSaved(false);
        setShowConfetti(false);
      }, 400);
      
      // Construct the Win object
      const newWin: Win = {
        id: winId,
        text: entry.text,
        tags: uniqueTags,
        createdAt: new Date(finalTimestamp).getTime(),
        starred: !!entry.starred,
        pinned: !!entry.pinned,
        isHabitMode: !!entry.isHabitMode,
        isBeDoHave: !!entry.isBeDoHave,
        beText: entry.beText || "",
        doText: entry.doText || "",
        haveText: entry.haveText || "",
        imageUrl: entry.imageUrl || null,
        reflections: entry.reflections || "",
        embedding: embedding
      };

      // Update local state for wins and allWins immediately
      setWins(prev => {
        const filtered = prev.filter(w => w.id !== entry.id && w.id !== winId);
        const updated = [newWin, ...filtered];
        updated.sort((a, b) => b.createdAt - a.createdAt);
        return updated;
      });
      setAllWins(prev => {
        const filtered = prev.filter(w => w.id !== entry.id && w.id !== winId);
        const updated = [newWin, ...filtered];
        updated.sort((a, b) => b.createdAt - a.createdAt);
        return updated;
      });

      // Update originalEntries and draftEntries to reflect the save instantly
      const updatedEntry = { ...entry, id: winId, createdAt: new Date(finalTimestamp).getTime() };
      setDraftEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
      if (isNew) {
        setOriginalEntries(prev => [...prev, updatedEntry]);
      } else {
        setOriginalEntries(prev => prev.map(e => e.id === entryId ? updatedEntry : e));
      }

      // Generate embedding in the background if needed
      if (needsEmbeddingUpdate) {
        (async () => {
          try {
            const newEmbedding = await getEmbedding(entry.text);
            if (newEmbedding) {
              const { error: embedErr } = await supabase
                .from('wins')
                .update({ embedding: newEmbedding })
                .eq('id', winId);
              if (embedErr) throw embedErr;

              // Update local state
              setDraftEntries(prev => prev.map(e => e.id === winId ? { ...e, embedding: newEmbedding } : e));
              setOriginalEntries(prev => prev.map(e => e.id === winId ? { ...e, embedding: newEmbedding } : e));
              setWins(prev => prev.map(w => w.id === winId ? { ...w, embedding: newEmbedding } : w));
              setAllWins(prev => prev.map(w => w.id === winId ? { ...w, embedding: newEmbedding } : w));
              console.log(`Updated embedding in background for ${winId}`);
            }
          } catch (err) {
            console.error("Background single win embedding update failed:", err);
          }
        })();
      }

    } catch (error: any) {
      console.error("Save single win failed:", error);
      const details = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      setError(language === 'ID'
        ? `Gagal menyimpan entri atau foto. (Detail: ${details})`
        : `Failed to save entry. (Detail: ${details})`);
    }
  };

  const handleSaveWin = async (shouldRedirect: boolean | any = false) => {
    if (!user || (!hasChanges && !isJustSaved)) return;
    const validEntries = draftEntries.filter(e => e.text.trim());

    try {
      // Map to track the final state of entries after save
      const finalEntries: DraftEntry[] = [];
      const entriesToUpdateEmbeddings: { id: string; text: string }[] = [];
      const savedWinsList: Win[] = [];
      const winsDataToUpsert: any[] = [];
      const tagsToUpsert: any[] = [];
      const seenTagIds = new Set<string>();

      // Handle updates and additions
      for (const entry of validEntries) {
        const isNew = entry.id.startsWith('new_');
        const winId = isNew ? 'win_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9) : entry.id;
        const original = originalEntries.find(o => o.id === entry.id);
        
        let finalTimestamp: string;
        if (isNew) {
          const now = new Date();
          const timestampDate = new Date(selectedDate);
          timestampDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
          finalTimestamp = timestampDate.toISOString();
        } else if (original?.createdAt) {
          finalTimestamp = new Date(original.createdAt).toISOString();
        } else {
          const fallbackDate = new Date(selectedDate);
          fallbackDate.setHours(12, 0, 0, 0);
          finalTimestamp = fallbackDate.toISOString();
        }

        // If text changed or no embedding, mark for background update
        if (!entry.embedding || entry.text !== original?.text) {
          entriesToUpdateEmbeddings.push({ id: winId, text: entry.text });
        }

        let uniqueTags = Array.from(new Set<string>(entry.tags || []));
        if (entry.isBeDoHave && !uniqueTags.includes('BEDOHAVE')) {
          uniqueTags.push('BEDOHAVE');
        }

        const data = {
          id: winId,
          text: entry.text,
          tags: uniqueTags,
          user_id: user.uid,
          created_at: finalTimestamp,
          starred: !!entry.starred,
          pinned: !!entry.pinned,
          is_habit_mode: !!entry.isHabitMode,
          is_be_do_have: !!entry.isBeDoHave,
          be_text: entry.beText || "",
          do_text: entry.doText || "",
          have_text: entry.haveText || "",
          image_url: entry.imageUrl || null,
          embedding: entry.embedding || null,
          reflections: entry.reflections || ""
        };
        
        winsDataToUpsert.push(data);

        // Collect tags for bulk upsert
        for (const tagName of uniqueTags) {
          const sanitizedTagName = tagName.replace('#', '').toLowerCase().replace(/[^a-z0-9_-]/g, '');
          const tagId = `${user.uid}_${sanitizedTagName}`;
          if (!seenTagIds.has(tagId)) {
            seenTagIds.add(tagId);
            tagsToUpsert.push({
              id: tagId,
              name: tagName,
              user_id: user.uid,
              count: 1
            });
          }
        }

        const newWin: Win = {
          id: winId,
          text: entry.text,
          tags: uniqueTags,
          createdAt: new Date(finalTimestamp).getTime(),
          starred: !!entry.starred,
          pinned: !!entry.pinned,
          isHabitMode: !!entry.isHabitMode,
          isBeDoHave: !!entry.isBeDoHave,
          beText: entry.beText || "",
          doText: entry.doText || "",
          haveText: entry.haveText || "",
          imageUrl: entry.imageUrl || null,
          reflections: entry.reflections || "",
          embedding: entry.embedding || null
        };
        savedWinsList.push(newWin);

        finalEntries.push({ ...entry, id: winId, createdAt: new Date(finalTimestamp).getTime() });
      }

      // 1. Perform bulk upsert of wins
      if (winsDataToUpsert.length > 0) {
        const { error: winErr } = await supabase.from('wins').upsert(winsDataToUpsert);
        if (winErr) throw winErr;
      }

      // 2. Perform bulk upsert of tags
      if (tagsToUpsert.length > 0) {
        const { error: tagsErr } = await supabase.from('tags').upsert(tagsToUpsert);
        if (tagsErr) throw tagsErr;
      }

      // Handle deletions in bulk
      const deletedIds: string[] = [];
      for (const original of originalEntries) {
        if (!original.id.startsWith('new_') && !draftEntries.find(d => d.id === original.id)) {
          deletedIds.push(original.id);
        }
      }

      if (deletedIds.length > 0) {
        const { error: deleteErr } = await supabase
          .from('wins')
          .delete()
          .in('id', deletedIds);
        if (deleteErr) throw deleteErr;
      }

      if (shouldRedirect === true) {
        setActiveView('home');
      }
      
      // Update local state for wins and allWins immediately
      setWins(prev => {
        const savedIds = new Set(savedWinsList.map(w => w.id));
        const filtered = prev.filter(w => !deletedIds.includes(w.id) && !savedIds.has(w.id));
        const updated = [...savedWinsList, ...filtered];
        updated.sort((a, b) => b.createdAt - a.createdAt);
        return updated;
      });
      setAllWins(prev => {
        const savedIds = new Set(savedWinsList.map(w => w.id));
        const filtered = prev.filter(w => !deletedIds.includes(w.id) && !savedIds.has(w.id));
        const updated = [...savedWinsList, ...filtered];
        updated.sort((a, b) => b.createdAt - a.createdAt);
        return updated;
      });

      // Update state to reflect saved state immediately
      setDraftEntries(finalEntries);
      setOriginalEntries(JSON.parse(JSON.stringify(finalEntries)));
      
      setIsJustSaved(true);
      setShowConfetti(true);
      setTimeout(() => {
        setIsJustSaved(false);
        setShowConfetti(false);
      }, 400);

      // Generate embeddings in the background and update Supabase
      if (entriesToUpdateEmbeddings.length > 0) {
        (async () => {
          for (const item of entriesToUpdateEmbeddings) {
            try {
              const embedding = await getEmbedding(item.text);
              if (embedding) {
                const { error: embedErr } = await supabase
                  .from('wins')
                  .update({ embedding })
                  .eq('id', item.id);
                if (embedErr) throw embedErr;

                // Update local state
                setDraftEntries(prev => prev.map(e => e.id === item.id ? { ...e, embedding } : e));
                setOriginalEntries(prev => prev.map(e => e.id === item.id ? { ...e, embedding } : e));
                setWins(prev => prev.map(w => w.id === item.id ? { ...w, embedding } : w));
                setAllWins(prev => prev.map(w => w.id === item.id ? { ...w, embedding } : w));
                console.log(`Updated embedding for ${item.id}`);
              }
            } catch (err) {
              console.error("Background embedding update failed:", err);
            }
          }
        })();
      }
      
    } catch (error: any) {
      console.error("Save win failed:", error);
      const details = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
      setError(language === 'ID' 
        ? `Gagal menyimpan entri atau foto. Silakan periksa koneksi internet Anda atau coba kurangi resolusi foto. (Detail: ${details})`
        : `Failed to save entry or photo. Please check your internet connection or try reducing the photo resolution. (Detail: ${details})`);
    }
  };

  const updateDraftEntry = (id: string, updates: Partial<DraftEntry>) => {
    let finalUpdates = updates;
    if (updates.tags) {
      // Automatically deduplicate tags whenever they are updated
      finalUpdates = { ...updates, tags: Array.from(new Set(updates.tags)) };
    }
    setDraftEntries(draftEntries.map(e => e.id === id ? { ...e, ...finalUpdates } : e));
  };

  const removeDraftEntry = (id: string) => {
    if (draftEntries.length === 1) {
      setDraftEntries([{ id: Math.random().toString(36).substr(2, 9), text: '', reflections: '', tags: [], starred: false, pinned: false }]);
    } else {
      setDraftEntries(draftEntries.filter(e => e.id !== id));
    }
  };

  const addTagToEntry = (entryId: string) => {
    const tagName = tagInput[entryId]?.trim();
    if (!tagName) return;

    const formattedTag = tagName.startsWith('#') ? tagName.toUpperCase() : `#${tagName.toUpperCase()}`;
    const entry = draftEntries.find(e => e.id === entryId);
    
    if (entry && !entry.tags.includes(formattedTag)) {
      updateDraftEntry(entryId, { tags: [...entry.tags, formattedTag] });
    }
    
    setTagInput({ ...tagInput, [entryId]: '' });
  };

  const removeTagFromEntry = (entryId: string, tagName: string) => {
    const entry = draftEntries.find(e => e.id === entryId);
    if (entry) {
      updateDraftEntry(entryId, { tags: entry.tags.filter(t => t !== tagName) });
    }
  };

  const changeDate = (days: number) => {
    const next = new Date(viewBaseDate);
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);
    setViewBaseDate(next);
  };

  const handleTriggerAI = async () => {
    if (wins.length === 0) return;
    setAnalyzing(true);
    const insight = await analyzeWins(wins.slice(0, 5));
    setAiInsight(insight);
    setAnalyzing(false);
  };

  const handleChatSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatting || !user) return;

    const userMessage = chatInput.trim();
    setChatInput('');
    setIsChatting(true);

    const newUserHistoryItem: { role: 'user', parts: { text: string }[] } = { 
      role: 'user', 
      parts: [{ text: userMessage }] 
    };
    
    setChatHistory(prev => [...prev, newUserHistoryItem]);

    const shortName = user?.displayName?.split(' ')[0] || "Teman";
    const result = await chatWithAI(userMessage, chatHistory, wins, shortName, aiMemory);
    
    setChatHistory(prev => [...prev, { 
      role: 'model', 
      parts: [{ text: result.text }],
      usage: result.usage
    }]);

    if (result.aiMemory) {
      saveAiMemory(result.aiMemory);
    }

    if (result.isQuotaExceeded) {
      setError(language === 'ID' 
        ? "Batas Kuota OpenAI/Gemini Habis. Silakan perbarui API Key 'OPEN_API' di menu Settings / Secrets panel." 
        : "OpenAI/Gemini API Limit reached. Please update 'OPEN_API' Key in your Secrets panel.");
    }
    
    setIsChatting(false);
  };

  const saveAiMemory = async (newMemory: string) => {
    if (!user) return;
    setAiMemory(newMemory);
    try {
      const { error } = await supabase
        .from('settings')
        .upsert({ 
          user_id: user.uid, 
          ai_memory: newMemory,
          templates: templates
        });
      if (error) throw error;
    } catch (err) {
      console.error("Failed to save AI memory:", err);
    }
  };

  const toggleChatStar = async (chatIndex: number) => {
    if (!user) return;
    const chat = chatHistory[chatIndex];
    if (chat.role !== 'model') return;

    const userPrompt = chatHistory[chatIndex - 1]?.parts[0].text || "Coach Insight";
    const cleanedResponse = cleanAiResponse(chat.parts[0].text);
    
    // Find matching star using robust cleaned comparison
    const existingStar = chatStars.find(s => 
      s.userPrompt.trim().toLowerCase() === userPrompt.trim().toLowerCase() && 
      cleanAiResponse(s.aiResponse) === cleanedResponse
    );

    if (existingStar) {
      // Optimistic state update: remove instantly from local state
      setChatStars(prev => prev.filter(s => s.id !== existingStar.id));
      
      try {
        const { error } = await supabase
          .from('chat_stars')
          .delete()
          .eq('id', existingStar.id);
        if (error) throw error;
      } catch (err) {
        console.error("Failed to delete chat star:", err);
        // Rollback state on database write failure
        setChatStars(prev => [existingStar, ...prev]);
      }
    } else {
      const starId = 'star_' + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 9);
      const newStar = {
        id: starId,
        userId: user.uid,
        userPrompt: userPrompt,
        aiResponse: cleanedResponse, // Save cleaned version to database & state
        createdAt: Date.now()
      };

      // Optimistic state update: add instantly to local state
      setChatStars(prev => [newStar, ...prev]);

      try {
        const { error } = await supabase
          .from('chat_stars')
          .insert({
            id: starId,
            user_id: user.uid,
            user_prompt: userPrompt,
            ai_response: cleanedResponse, // Save cleaned version to database & state
            created_at: new Date().toISOString()
          });
        if (error) throw error;
      } catch (err) {
        console.error("Failed to create chat star:", err, err?.message || err);
        // Rollback state on database write failure
        setChatStars(prev => prev.filter(s => s.id !== starId));
      }
    }
  };

  const deleteChatStar = async (starId: string) => {
    if (!user) return;
    const existingStar = chatStars.find(s => s.id === starId);
    if (!existingStar) return;

    // Optimistic state update: remove instantly from local state
    setChatStars(prev => prev.filter(s => s.id !== starId));
    
    try {
      const { error } = await supabase
        .from('chat_stars')
        .delete()
        .eq('id', starId);
      if (error) throw error;
    } catch (err) {
      console.error("Failed to delete chat star:", err);
      // Rollback state on database write failure
      setChatStars(prev => [existingStar, ...prev]);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center overflow-x-hidden">
        <div className="w-full max-w-md min-h-screen bg-background shadow-2xl flex flex-col items-center justify-center gap-8 p-12 text-center relative overflow-x-hidden">
          <div className="relative">
            <div className="w-16 h-16 border-t-2 border-primary rounded-full animate-spin" />
            {!hasAuthHint && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary/40" />
              </div>
            )}
          </div>
          <div className="space-y-2">
            <h2 className="font-sans font-bold text-xl tracking-tighter">WINNING</h2>
            <p className="label-caps opacity-40 text-[9px] tracking-[0.3em]">
              {hasAuthHint ? "Menunggu Verifikasi..." : "Inisialisasi..."}
            </p>
          </div>
          {/* If stuck for too long, show a way out */}
          <button 
            onClick={() => setLoading(false)}
            className="mt-8 text-[10px] uppercase tracking-widest font-bold opacity-30 hover:opacity-100 transition-opacity"
          >
            Lewati Loading
          </button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center overflow-x-hidden">
        <div className="w-full max-w-md min-h-screen bg-background shadow-2xl flex flex-col items-center justify-center p-8 text-center gap-6 relative overflow-x-hidden">
          <div className="space-y-2 mb-2">
            <h1 className="font-sans font-bold text-5xl tracking-tighter">{t.welcome.toUpperCase()}</h1>
            <p className="text-on-surface-variant max-w-xs text-sm opacity-70">
              "{t.quote_prefix}"
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="w-full space-y-4 text-left bg-surface-container-low p-6 rounded-3xl border border-surface-container-highest shadow-sm">
            <h2 className="text-xl font-bold text-center tracking-tight mb-2">
              {authMode === 'login' 
                ? (language === 'ID' ? 'Masuk ke Akun Anda' : 'Login to Your Account')
                : (language === 'ID' ? 'Daftar Akun Baru' : 'Register New Account')}
            </h2>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold p-3.5 rounded-2xl flex items-center justify-between gap-2">
                <span className="break-all">{error}</span>
                <button type="button" onClick={() => setError(null)} className="opacity-70 hover:opacity-100 font-black px-1">X</button>
              </div>
            )}

            {authMode === 'register' && (
              <>
                <div>
                  <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">
                    {language === 'ID' ? 'Nama Lengkap' : 'Full Name'}
                  </label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 bg-background border border-surface-container-highest rounded-2xl focus:outline-none focus:border-primary text-sm transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">
                    Username
                  </label>
                  <input
                    type="text"
                    required
                    value={authUsername}
                    onChange={(e) => setAuthUsername(e.target.value)}
                    placeholder="e.g. johndoe"
                    className="w-full px-4 py-3 bg-background border border-surface-container-highest rounded-2xl focus:outline-none focus:border-primary text-sm transition-all"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">
                Email
              </label>
              <input
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full px-4 py-3 bg-background border border-surface-container-highest rounded-2xl focus:outline-none focus:border-primary text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold opacity-60 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-background border border-surface-container-highest rounded-2xl focus:outline-none focus:border-primary text-sm transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full flex items-center justify-center gap-3 bg-primary text-white py-4 rounded-2xl font-bold text-base hover:scale-[1.02] active:scale-95 transition-all shadow-lg disabled:opacity-50 disabled:scale-100 mt-4 cursor-pointer"
            >
              {loggingIn ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {authMode === 'login' 
                    ? (language === 'ID' ? 'Memverifikasi...' : 'Verifying...')
                    : (language === 'ID' ? 'Mendaftar...' : 'Registering...')}
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {authMode === 'login' 
                    ? (language === 'ID' ? 'Masuk' : 'Login')
                    : (language === 'ID' ? 'Daftar' : 'Register')}
                </>
              )}
            </button>
          </form>

          <button
            type="button"
            onClick={() => {
              setError(null);
              setAuthMode(authMode === 'login' ? 'register' : 'login');
            }}
            className="text-xs font-bold text-primary hover:underline transition-all"
          >
            {authMode === 'login'
              ? (language === 'ID' ? 'Belum punya akun? Daftar di sini' : "Don't have an account? Register here")
              : (language === 'ID' ? 'Sudah punya akun? Masuk di sini' : 'Already have an account? Login here')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-container-lowest flex flex-col items-center overflow-x-hidden">
      <div className="w-full max-w-md min-h-screen bg-background shadow-2xl flex flex-col items-center relative overflow-x-hidden">
        {error && (
          <div className="bg-red-500 text-white p-4 w-full text-center sticky top-0 z-[100] flex items-center justify-center gap-4">
            <span className="text-sm font-bold">{error}</span>
            <button onClick={() => setError(null)} className="hover:scale-110"><X className="w-4 h-4" /></button>
          </div>
        )}
        {/* Top App Bar */}
        <header className="bg-background/80 backdrop-blur-md flex justify-between items-center px-margin-page py-2 w-full sticky top-0 z-40">
          <h1 className="font-sans font-bold text-xl tracking-tighter">WINNING</h1>

          <div className="flex items-center gap-1">
            <button className="p-1.5 text-on-surface-variant hover:text-primary transition-colors relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-tertiary rounded-full border border-background"></span>
            </button>
            <div className="relative">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setIsUserMenuOpen(!isUserMenuOpen);
                }}
                title="Profile & Settings"
                className="w-8 h-8 rounded-full overflow-hidden border-2 border-surface-container-highest ml-0.5 hover:border-primary transition-all active:scale-95 group relative"
              >
                <img 
                  src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} 
                  alt="User" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <Settings className="w-3 h-3 text-primary" />
                </div>
              </button>

              <AnimatePresence>
                {isUserMenuOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-40 bg-black/5"
                      onClick={() => setIsUserMenuOpen(false)}
                    />
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 5, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 top-full z-50 bg-surface border border-surface-container shadow-2xl rounded-2xl overflow-hidden min-w-[200px]"
                    >
                      <div className="p-4 border-b border-surface-container-low">
                        <p className="text-xs font-bold truncate">{user.displayName || user.email}</p>
                        <p className="text-[10px] opacity-40 truncate">{user.email}</p>
                      </div>

                      <div className="p-2">
                        <div className="flex flex-col gap-1">
                          <div className="px-3 py-1">
                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">
                              {language === 'ID' ? 'BAHASA' : 'LANGUAGE'}
                            </p>
                            <div className="flex bg-surface-container-low rounded-lg p-1">
                              <button 
                                onClick={() => {
                                  setLanguage('EN');
                                  setIsUserMenuOpen(false);
                                }}
                                className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'EN' ? 'bg-surface shadow-sm text-primary' : 'opacity-40'}`}
                              >
                                ENGLISH
                              </button>
                              <button 
                                onClick={() => {
                                  setLanguage('ID');
                                  setIsUserMenuOpen(false);
                                }}
                                className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all ${language === 'ID' ? 'bg-surface shadow-sm text-primary' : 'opacity-40'}`}
                              >
                                INDONESIA
                              </button>
                            </div>
                          </div>

                          <div className="h-px bg-surface-container-low my-1" />

                          <button 
                            onClick={() => {
                              setActiveView('profile');
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-surface-container-low transition-colors text-left"
                          >
                            <UserIcon className="w-4 h-4 opacity-60" />
                            <span className="text-xs font-medium">{t.profile}</span>
                          </button>

                          <div className="h-px bg-surface-container-low my-1" />

                          <div className="px-3 py-2">
                            <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.2em] mb-2">
                              {t.theme}
                            </p>
                            <div className="flex bg-surface-container-low rounded-lg p-1">
                              <button 
                                onClick={() => {
                                  setTheme('light');
                                  setIsUserMenuOpen(false);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${theme === 'light' ? 'bg-surface shadow-sm text-primary' : 'opacity-40'}`}
                              >
                                <Sun className="w-3 h-3" />
                                {t.light}
                              </button>
                              <button 
                                onClick={() => {
                                  setTheme('dark');
                                  setIsUserMenuOpen(false);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-[10px] font-bold transition-all ${theme === 'dark' ? 'bg-surface shadow-sm text-primary' : 'opacity-40'}`}
                              >
                                <Moon className="w-3 h-3" />
                                {t.dark}
                              </button>
                            </div>
                          </div>

                          <div className="h-px bg-surface-container-low my-1" />

                          <button 
                            onClick={() => {
                              handleLogout();
                              setIsUserMenuOpen(false);
                            }}
                            className="flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-red-500/10 text-red-500 transition-colors text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span className="text-xs font-bold">{t.logout}</span>
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <main className="w-full px-margin-page pb-32 pt-1 flex flex-col gap-3">
        <AnimatePresence mode="wait">
          {activeView === 'home' && (
            <motion.div 
              key="home"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-stack-lg"
            >
              {/* Inspiration Carousel Section */}
              <section className="relative group/carousel">
                <div className="relative overflow-hidden h-[120px] md:h-[100px] flex items-center">
                  <AnimatePresence mode="popLayout">
                    <motion.div 
                      key={pinnedQuotes.length > 0 ? `pinned-${currentQuoteIndex % pinnedQuotes.length}` : currentQuoteIndex}
                      initial={{ opacity: 0, x: 30 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -30 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="w-full text-center"
                      drag="x"
                      dragConstraints={{ left: 0, right: 0 }}
                      dragElastic={0.2}
                      onDragEnd={(_, info) => {
                        const length = pinnedQuotes.length > 0 ? pinnedQuotes.length : QUOTES.length;
                        if (info.offset.x < -100) {
                          setCurrentQuoteIndex(prev => (prev + 1) % length);
                        } else if (info.offset.x > 100) {
                          setCurrentQuoteIndex(prev => (prev - 1 + length) % length);
                        }
                      }}
                    >
                      <div className="flex flex-col gap-2 pointer-events-none select-none h-full justify-center">
                        <p className={`font-serif italic text-on-surface leading-tight px-10 transition-all duration-300 ${
                          displayQuote.text.length > 100 
                            ? 'text-sm md:text-base' 
                            : displayQuote.text.length > 60 
                              ? 'text-base md:text-lg' 
                              : 'text-lg md:text-xl'
                        }`}>
                          "{displayQuote.text}"
                        </p>
                        <div className="flex items-center justify-center gap-3">
                           <div className="w-6 h-px bg-on-surface/10" />
                           <p className="label-caps text-[8px] opacity-30 tracking-[0.4em]">{displayQuote.author.toUpperCase()}</p>
                           <div className="w-6 h-px bg-on-surface/10" />
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation Buttons */}
                  <button 
                    onClick={() => {
                      const length = pinnedQuotes.length > 0 ? pinnedQuotes.length : QUOTES.length;
                      setCurrentQuoteIndex(prev => (prev === 0 ? length - 1 : prev - 1));
                    }}
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-on-surface/5 z-10"
                  >
                    <ChevronLeft className="w-5 h-5 opacity-40" />
                  </button>
                  <button 
                    onClick={() => {
                      const length = pinnedQuotes.length > 0 ? pinnedQuotes.length : QUOTES.length;
                      setCurrentQuoteIndex(prev => (prev + 1) % length);
                    }}
                    className="absolute right-0 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-on-surface/5 z-10"
                  >
                    <ChevronRight className="w-5 h-5 opacity-40" />
                  </button>
                </div>
                
                <div className="flex justify-center gap-1.5 opacity-20">
                  {(pinnedQuotes.length > 0 ? pinnedQuotes : QUOTES).map((_, i) => (
                    <div 
                      key={i} 
                      className={`h-1 rounded-full transition-all duration-300 ${i === (currentQuoteIndex % (pinnedQuotes.length > 0 ? pinnedQuotes.length : QUOTES.length)) ? 'w-4 bg-secondary opacity-100' : 'w-1 bg-on-surface'}`} 
                    />
                  ))}
                </div>
              </section>

              {/* Entry Counter Bar Chart */}
                <section className="bg-surface rounded-[40px] p-8 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="label-caps opacity-40 uppercase tracking-widest">{t.activity}</h3>
                    <p className="text-2xl font-bold text-on-surface">{language === 'ID' ? 'Kemenangan Mingguan' : 'Weekly Wins'}</p>
                  </div>
                  <div className="bg-secondary/10 px-4 py-2 rounded-2xl">
                    <span className="text-secondary font-bold text-sm">{activityData.reduce((acc, d) => acc + d.count, 0)} {t.total}</span>
                  </div>
                </div>

                <div className="flex items-end justify-between h-24 gap-2 px-2">
                  {activityData.map((day, i) => {
                    const maxCount = Math.max(...activityData.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    const colors = [
                      'bg-secondary', 
                      'bg-orange-500', 
                      'bg-blue-500', 
                      'bg-purple-500', 
                      'bg-rose-500', 
                      'bg-emerald-500',
                      'bg-amber-500'
                    ];
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full relative h-16 flex items-end">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(day.count > 0 ? 10 : 0, height)}%` }}
                            className={`w-full rounded-t-lg transition-all duration-500 relative ${day.isToday ? 'bg-secondary' : colors[i % colors.length]}`}
                          >
                             {day.count > 0 && (
                               <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                 {day.count} Wins
                               </span>
                             )}
                          </motion.div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-bold ${day.isToday ? 'text-secondary font-black' : 'opacity-40'}`}>{day.label}</span>
                          <span className={`text-[11px] font-black transition-all duration-300 ${day.isToday ? 'text-secondary' : 'opacity-60'}`}>
                            {day.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Habits Counter Bar Chart */}
              <section className="bg-surface rounded-[40px] p-8 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="label-caps opacity-40 uppercase tracking-widest">{t.activity}</h3>
                    <p className="text-2xl font-bold text-on-surface">{t.habit_history}</p>
                  </div>
                  <div className="bg-primary/10 px-4 py-2 rounded-2xl">
                    <span className="text-primary font-bold text-sm">{habitActivityData.reduce((acc, d) => acc + d.count, 0)} {t.total}</span>
                  </div>
                </div>

                <div className="flex items-end justify-between h-24 gap-2 px-2">
                  {habitActivityData.map((day, i) => {
                    const maxCount = Math.max(...habitActivityData.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    const colors = [
                      'bg-primary', 
                      'bg-orange-500', 
                      'bg-blue-500', 
                      'bg-purple-500', 
                      'bg-rose-500', 
                      'bg-emerald-500',
                      'bg-amber-500'
                    ];
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full relative h-16 flex items-end">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(day.count > 0 ? 10 : 0, height)}%` }}
                            className={`w-full rounded-t-lg transition-all duration-500 relative ${day.isToday ? 'bg-primary' : colors[i % colors.length]}`}
                          >
                             {day.count > 0 && (
                               <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                 {day.count} Habits
                               </span>
                             )}
                          </motion.div>
                        </div>
                        <div className="flex flex-col items-center">
                          <span className={`text-[10px] font-bold ${day.isToday ? 'text-primary font-black' : 'opacity-40'}`}>{day.label}</span>
                          <span className={`text-[11px] font-black transition-all duration-300 ${day.isToday ? 'text-primary' : 'opacity-60'}`}>
                            {day.count}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Be-Do-Have Streak & Counter */}
              <section className="bg-surface rounded-[40px] p-8 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="label-caps opacity-40 uppercase tracking-widest">STREAK BE-DO-HAVE</h3>
                    <p className="text-2xl font-bold text-on-surface">
                      {language === 'ID' ? 'Konsistensi Jati Diri' : 'Self-Identity Streak'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="bg-[#0091EA]/10 border border-[#0091EA]/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                      <span className="text-xs font-bold text-[#0091EA] dark:text-[#00e5ff] flex items-center gap-1">
                        <span>🔥</span> {beDoHaveStreakCount} {language === 'ID' ? 'Hari' : 'Days'}
                      </span>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-sm">
                      <span className="text-xs font-bold text-emerald-500">
                        Total {totalBeDoHaveCount}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {beDoHaveWeeklyMomentum.map((day, idx) => (
                    <div 
                      key={day.name + idx} 
                      className={`flex flex-col items-center gap-2 py-3 px-1 rounded-2xl transition-all ${
                        day.isToday ? 'bg-[#0091EA]/5 ring-1 ring-[#0091EA]/20' : ''
                      }`}
                    >
                      <span className={`text-[9px] font-bold tracking-widest ${day.isToday ? 'text-[#0091EA] dark:text-[#00e5ff] font-black' : 'opacity-30'}`}>
                        {day.name}
                      </span>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                        day.hasWin 
                          ? 'bg-gradient-to-br from-[#0091EA] to-[#00b0ff] text-white shadow-lg shadow-[#0091EA]/20 scale-105' 
                          : 'bg-surface-container text-on-surface border border-surface-container-high opacity-30 shadow-inner'
                      }`}>
                        {day.hasWin ? (
                          <Check className="w-5 h-5 transition-transform duration-300" />
                        ) : day.isToday ? (
                          <Star className="w-5 h-5 fill-current animate-pulse text-[#0091EA] dark:text-[#00e5ff]" />
                        ) : (
                          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-20" />
                        )}
                      </div>
                      <span className={`text-[9px] font-bold ${day.isToday ? 'text-[#0091EA] dark:text-[#00e5ff]' : 'opacity-30'}`}>
                        {day.date}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Tag Insights */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h2 className="label-caps">Tag Insights</h2>
                  <div className="flex bg-surface-container rounded-full p-1 text-[10px] font-bold">
                    <button 
                      onClick={() => setInsightPeriod('week')}
                      className={`px-3 py-1 rounded-full transition-all ${insightPeriod === 'week' ? 'bg-surface shadow-sm' : 'opacity-40'}`}
                    >
                      WEEK
                    </button>
                    <button 
                      onClick={() => setInsightPeriod('month')}
                      className={`px-3 py-1 rounded-full transition-all ${insightPeriod === 'month' ? 'bg-surface shadow-sm' : 'opacity-40'}`}
                    >
                      MONTH
                    </button>
                    <button 
                      onClick={() => setInsightPeriod('year')}
                      className={`px-3 py-1 rounded-full transition-all ${insightPeriod === 'year' ? 'bg-surface shadow-sm' : 'opacity-40'}`}
                    >
                      YEAR
                    </button>
                  </div>
                </div>
                <div className="bg-surface p-padding-card rounded-lg bento-card flex flex-col gap-6">
                  {tagInsights.length > 0 ? tagInsights.map(stat => (
                    <div key={stat.label} className="flex flex-col gap-2">
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold uppercase">{stat.label}</span>
                        <span className="text-xs font-bold">{stat.value}</span>
                      </div>
                      <div className="w-full bg-surface-container-high h-2.5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${(stat.value / stat.total) * 100}%` }}
                          className={`${stat.color} h-full rounded-full`} 
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 opacity-40 italic text-sm">No tag data available yet.</div>
                  )}
                </div>
              </section>



              {/* Recent Activity */}
              <section>
                <h2 className="label-caps mb-3 uppercase tracking-widest">{language === 'ID' ? 'Kemenangan Terakhir' : 'Last Recorded Win'}</h2>
    {wins.length > 0 ? (
      <div 
        className={`p-padding-card rounded-lg bento-card group transition-colors overflow-hidden ${
        wins[0].isHabitMode 
          ? 'bg-[#6FCF97] dark:bg-[#2D5A43] border-[#6FCF97] dark:border-[#2D5A43]' 
          : (wins[0].isBeDoHave
              ? 'bg-[#0091EA] dark:bg-[#01579B] border-[#0091EA] dark:border-[#01579B] text-white shadow-[0_0_15px_rgba(0,145,234,0.3)] dark:shadow-[0_0_25px_rgba(1,87,155,0.4)]'
              : 'bg-surface border border-surface-container')
      }`}>
        {wins[0].imageUrl && (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              setPreviewImageUrl(wins[0].imageUrl || null);
            }}
            className="w-full h-32 -mx-padding-card -mt-padding-card mb-4 overflow-hidden cursor-zoom-in"
          >
            <img src={wins[0].imageUrl} alt="Win attachment" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
          </div>
        )}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 flex items-center justify-center ${(wins[0].isHabitMode || wins[0].isBeDoHave) ? 'text-white' : 'text-tertiary'}`}>
              {(wins[0].isHabitMode || wins[0].isBeDoHave) ? <CheckCircle2 className="w-6 h-6" /> : <Award className="w-6 h-6" />}
            </div>
            <div>
              <p className={`font-bold text-lg leading-none truncate max-w-[200px] ${(wins[0].isHabitMode || wins[0].isBeDoHave) ? 'text-white' : ''}`}>{wins[0].text}</p>
              <p className={`label-caps text-[10px] mt-1 ${(wins[0].isHabitMode || wins[0].isBeDoHave) ? 'text-white opacity-80' : 'opacity-60'}`}>
                {((wins[0].createdAt as any).toDate ? (wins[0].createdAt as any).toDate() : new Date(wins[0].createdAt)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
          <ChevronRight className={`w-5 h-5 group-hover:translate-x-1 transition-transform ${(wins[0].isHabitMode || wins[0].isBeDoHave) ? 'text-white' : 'text-on-surface-variant'}`} />
        </div>
        <p className={`text-body-sm line-clamp-2 ${(wins[0].isHabitMode || wins[0].isBeDoHave) ? 'text-white opacity-90' : 'text-on-surface-variant'}`}>
          {wins[0].text}
        </p>
                    {!(wins[0].isHabitMode) && wins[0].tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        {wins[0].tags.map(tag => (
                          <span key={tag} className={`px-3 py-1 rounded-full text-[10px] font-bold ${
                            wins[0].isBeDoHave 
                              ? 'bg-white/20 text-white' 
                              : 'bg-primary/5 text-primary'
                          }`}>{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface p-padding-card rounded-lg bento-card text-center opacity-40">
                    <p className="label-caps">{t.no_wins}</p>
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeView === 'chat' && (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex flex-col gap-6 min-h-[calc(100vh-250px)] relative pb-20 pt-4"
            >
              {/* Starred Messages Dropdown */}
              {chatStars.length > 0 && (
                <div className="relative mb-2">
                  <button 
                    onClick={() => setIsStarDropdownOpen(!isStarDropdownOpen)}
                    className="w-full bg-surface-container-low border border-surface-container p-4 rounded-2xl flex items-center justify-between shadow-sm hover:border-secondary/30 transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <Star className="w-4 h-4 text-secondary fill-secondary" />
                      <span className="text-xs font-bold opacity-60 uppercase tracking-widest">
                        {t.starred_insights}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 opacity-40 transition-transform ${isStarDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isStarDropdownOpen && (
                      <>
                        <motion.div 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="fixed inset-0 z-40"
                          onClick={() => setIsStarDropdownOpen(false)}
                        />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 5, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute left-0 right-0 top-full z-50 bg-surface border border-surface-container shadow-2xl rounded-2xl overflow-hidden max-h-[350px] overflow-y-auto"
                        >
                          {Object.entries(groupedStars).map(([date, stars]) => (
                            <div key={date} className="border-b border-surface-container last:border-none">
                              <div className="bg-surface-container-low px-4 py-2 text-[9px] font-black opacity-30 uppercase tracking-[0.2em]">
                                {date}
                              </div>
                              <div className="flex flex-col">
                                {stars.map((star) => (
                                  <div
                                    key={star.id}
                                    className="hover:bg-secondary/5 transition-colors flex items-center justify-between border-b border-surface-container/50 last:border-none group/star"
                                  >
                                    <button
                                      onClick={() => {
                                        setChatHistory([
                                          { role: 'user', parts: [{ text: star.userPrompt }] },
                                          { role: 'model', parts: [{ text: star.aiResponse }] }
                                        ] as any);
                                        setIsStarDropdownOpen(false);
                                      }}
                                      className="flex-1 p-4 text-left flex flex-col gap-1"
                                    >
                                      <p className="text-[10px] font-bold opacity-50 line-clamp-1 group-hover/star:text-secondary transition-colors italic">
                                        "{star.userPrompt}"
                                      </p>
                                      <p className="text-xs line-clamp-1 leading-relaxed opacity-80">
                                        {star.aiResponse}
                                      </p>
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        deleteChatStar(star.id);
                                      }}
                                      className="p-4 text-red-500 dark:text-red-400 opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
                                      title={t.delete}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="flex flex-col gap-6">
                {/* Initial Welcome Message if no history */}
                {chatHistory.length === 0 && (
                  <div className="flex flex-col gap-4 max-w-[90%]">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-6 h-6 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-primary fill-current" />
                      </div>
                      <span className="label-caps opacity-60 text-[10px]">COACH</span>
                    </div>
                    <div className="bg-surface rounded-2xl p-5 bento-card shadow-sm border border-surface-container">
                      <p className="mb-3 text-sm font-bold">Halo {user.displayName?.split(' ')[0]}!</p>
                      <p className="opacity-80 text-xs">
                        {language === 'ID' 
                          ? 'Tanyakan apa saja tentang perjalanan kemenangan Anda. Saya akan menjawab dengan singkat dan padat.'
                          : 'Ask anything about your winning journey. I will provide short and dense insights.'}
                      </p>
                      <div className="mt-4 p-3 bg-surface-container rounded-xl border border-surface-container">
                        <ul className="text-[11px] space-y-1.5 opacity-70">
                          <li>• {language === 'ID' ? '"Status proyek LMS minggu ini?"' : '"Status of LMS project this week?"'}</li>
                          <li>• {language === 'ID' ? '"Siapa yang paling sering muncul di win saya?"' : '"Who appears most often in my wins?"'}</li>
                          <li>• {language === 'ID' ? '"Beri motivasi singkat berdasarkan progres saya."' : '"Give short motivation based on my progress."'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* Chat History */}
                {chatHistory.map((chat, i) => (
                  <div key={i} className={`flex flex-col gap-2 ${chat.role === 'user' ? 'items-end ml-12' : 'items-start mr-12'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {chat.role === 'model' && (
                        <div className="w-5 h-5 flex items-center justify-center">
                          <Star className="w-3 h-3 text-primary fill-current" />
                        </div>
                      )}
                      <span className="label-caps text-[8px] opacity-40">
                        {chat.role === 'user' ? (language === 'ID' ? 'ANDA' : 'YOU') : 'COACH'}
                      </span>
                    </div>
                    <div className={`p-3 rounded-2xl relative ${
                      chat.role === 'user' 
                        ? 'bg-secondary text-white rounded-tr-none' 
                        : 'bg-surface rounded-tl-none border border-surface-container shadow-sm'
                    }`}>
                      <div className="text-xs leading-relaxed markdown-content">
                        <ReactMarkdown>{chat.parts[0].text}</ReactMarkdown>
                      </div>
                      
                      {chat.role === 'model' && chat.usage && (
                        <div className="mt-2.5 pt-2 border-t border-surface-container-high/60 flex items-center justify-between text-[9px] font-mono select-none text-on-surface-variant/50">
                          <span className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00E676] animate-pulse" />
                            <span>Input: <strong>{chat.usage.promptTokenCount ?? 0}</strong></span>
                          </span>
                          <span>Output: <strong>{chat.usage.candidatesTokenCount ?? 0}</strong></span>
                        </div>
                      )}
                      
                      {chat.role === 'model' && (
                        <button 
                          onClick={() => toggleChatStar(i)}
                          className={`absolute -right-10 top-0 p-2 transition-all hover:scale-110 active:scale-95 ${
                            chatStars.some(s => cleanAiResponse(s.aiResponse) === cleanAiResponse(chat.parts[0].text)) 
                              ? 'text-secondary opacity-100' 
                              : 'text-on-surface-variant opacity-20 hover:opacity-60'
                          }`}
                        >
                          <Star className={`w-4 h-4 ${chatStars.some(s => cleanAiResponse(s.aiResponse) === cleanAiResponse(chat.parts[0].text)) ? 'fill-current' : ''}`} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {isChatting && (
                  <div className="flex flex-col gap-2 items-start mr-12">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-5 h-5 flex items-center justify-center">
                        <Star className="w-3 h-3 text-primary fill-current" />
                      </div>
                      <span className="label-caps text-[8px] opacity-40">COACH</span>
                    </div>
                    <div className="bg-surface p-3 rounded-2xl rounded-tl-none border border-surface-container shadow-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-secondary" />
                      <span className="text-xs italic opacity-60">
                        {language === 'ID' ? 'Sedang mencari di database...' : 'Searching database...'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 mt-4 opacity-60">
                <button 
                  onClick={() => setChatInput(language === 'ID' ? "Berikan ringkasan pencapaian saya minggu ini" : "Summarize my achievements this week")}
                  className="bg-surface px-4 py-2 rounded-full border border-surface-container label-caps text-[9px] hover:bg-surface-container-low transition-colors"
                >
                  {language === 'ID' ? 'Ringkasan Minggu Ini' : 'Weekly Summary'}
                </button>
                <button 
                  onClick={() => setChatInput(language === 'ID' ? "Bagaimana performa tag #LMS saya?" : "How is my #LMS tag performance?")}
                  className="bg-surface px-4 py-2 rounded-full border border-surface-container label-caps text-[9px] hover:bg-surface-container-low transition-colors"
                >
                  {language === 'ID' ? 'Analisis Tag' : 'Tag Analysis'}
                </button>
              </div>
            </motion.div>
          )}

          {activeView === 'record' && (
            <motion.div 
              key="record"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col gap-2.5 w-full"
            >
              <div className="flex flex-col gap-2 w-full max-w-lg mx-auto">
                <div className="flex justify-between items-end w-full pb-1 border-b border-surface-container-high/30">
                  <div className="flex flex-col items-start gap-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant opacity-40">
                      {language === 'ID' ? 'PILIH TANGGAL' : 'SELECT DATE'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-serif italic text-primary">
                        {selectedDate.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { month: 'long' })}
                      </span>
                      <span className="text-lg font-sans font-bold text-secondary opacity-20">
                        {selectedDate.getFullYear()}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 pr-1 select-none">
                    <button
                      onClick={() => setRecordFilter(curr => curr === 'habit' ? 'all' : 'habit')}
                      className={`flex flex-col items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl border-2 transition-all duration-300 ${
                        recordFilter === 'habit'
                          ? 'bg-[#43A047]/10 border-[#43A047]/50 dark:bg-[#43A047]/20 scale-105 shadow-sm'
                          : 'border-transparent hover:bg-surface-container-high/40 opacity-70 hover:opacity-100'
                      }`}
                      title={language === 'ID' ? 'Filter hanya Kebiasaan/Habit' : 'Filter only Habits'}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant opacity-70 leading-none mb-1">
                        HABIT
                      </span>
                      <span className="text-xl sm:text-2xl font-black leading-none text-[#43A047] dark:text-[#a5d6a7]">
                        {draftEntries.filter(e => e.isHabitMode).length}
                      </span>
                    </button>
                    <div className="h-6 w-[1px] bg-surface-container-high/60 self-center" />
                    <button
                      onClick={() => setRecordFilter(curr => curr === 'entry' ? 'all' : 'entry')}
                      className={`flex flex-col items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl border-2 transition-all duration-300 ${
                        recordFilter === 'entry'
                          ? 'bg-secondary/10 border-secondary/50 dark:bg-secondary/20 scale-105 shadow-sm'
                          : 'border-transparent hover:bg-surface-container-high/40 opacity-70 hover:opacity-100'
                      }`}
                      title={language === 'ID' ? 'Filter hanya Entri Utama' : 'Filter only Main Entries'}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant opacity-70 leading-none mb-1">
                        ENTRY
                      </span>
                      <span className="text-xl sm:text-2xl font-black leading-none text-secondary">
                        {draftEntries.filter(e => !e.isHabitMode && !e.isBeDoHave).length}
                      </span>
                    </button>
                    <div className="h-6 w-[1px] bg-surface-container-high/60 self-center" />
                    <button
                      onClick={() => setRecordFilter(curr => curr === 'bedohave' ? 'all' : 'bedohave')}
                      className={`flex flex-col items-center px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-2xl border-2 transition-all duration-300 ${
                        recordFilter === 'bedohave'
                          ? 'bg-[#0091EA]/10 border-[#0091EA]/50 dark:bg-[#0091EA]/20 scale-105 shadow-sm'
                          : 'border-transparent hover:bg-surface-container-high/40 opacity-70 hover:opacity-100'
                      }`}
                      title={language === 'ID' ? 'Filter hanya Be Do Have' : 'Filter only Be Do Have'}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider text-on-surface-variant opacity-70 leading-none mb-1">
                        IDENTITY
                      </span>
                      <span className="text-xl sm:text-2xl font-black leading-none text-[#0091EA] dark:text-[#00e5ff]">
                        {draftEntries.filter(e => e.isBeDoHave).length}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1 sm:gap-3 w-full">
                  <button 
                    onClick={() => changeDate(-7)} 
                    className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high rounded-full transition-colors shrink-0"
                    title="Previous Week"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <div className="flex gap-0.5 sm:gap-1 items-center pb-1">
                    {displayedDays.map((d) => {
                      const isSelected = d.getTime() === selectedDate.getTime();
                      const isToday = new Date().setHours(0, 0, 0, 0) === d.getTime();
                      
                      return (
                        <button
                          key={d.getTime()}
                          onClick={() => {
                            const newDate = new Date(d);
                            newDate.setHours(0,0,0,0);
                            setSelectedDate(newDate);
                          }}
                          className={`flex flex-col items-center gap-0.5 min-w-[34px] sm:min-w-[48px] py-1.5 sm:py-2.5 rounded-xl transition-all ${
                            isSelected 
                              ? 'bg-secondary text-white shadow-md scale-105 z-10' 
                              : 'bg-surface-container-low hover:bg-surface-container-high text-on-surface-variant'
                          }`}
                        >
                          <span className={`text-[8px] sm:text-[10px] font-bold uppercase tracking-wider opacity-60 ${isSelected ? 'opacity-100' : ''}`}>
                            {d.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { weekday: 'short' }).charAt(0)}
                          </span>
                          <span className="text-[12px] sm:text-base font-bold">
                            {d.getDate()}
                          </span>
                          {isToday && !isSelected && (
                            <div className="w-1 h-1 bg-secondary rounded-full mt-0.5" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => changeDate(7)} 
                    className="w-10 h-10 flex items-center justify-center hover:bg-surface-container-high rounded-full transition-colors shrink-0"
                    title="Next Week"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-2.5">
                <div className="grid grid-cols-3 gap-2 mb-1">
                  <button 
                    onClick={() => addDraftEntry(true)}
                    className="py-3 border-2 border-dashed border-surface-container-highest rounded-lg flex flex-col items-center justify-center gap-0.5 label-caps opacity-60 hover:opacity-100 hover:bg-surface-container/5 hover:border-secondary/30 transition-all group"
                  >
                    <CheckCircle2 className="w-4 h-4 text-tertiary group-hover:scale-110 transition-transform" /> 
                    <span className="text-[8px] sm:text-[9px] truncate w-full text-center">{language === 'ID' ? 'Entri Habit' : 'Entry Habit'}</span>
                  </button>
                  <button 
                    onClick={() => addDraftEntry(false)}
                    className="py-3 border-2 border-dashed border-surface-container-highest rounded-lg flex flex-col items-center justify-center gap-0.5 label-caps opacity-60 hover:opacity-100 hover:bg-surface-container/5 hover:border-secondary/30 transition-all group"
                  >
                    <Plus className="w-4 h-4 text-secondary group-hover:scale-110 transition-transform" /> 
                    <span className="text-[8px] sm:text-[9px] truncate w-full text-center">{language === 'ID' ? 'Tambah Entri' : 'Add Entry'}</span>
                  </button>
                  <button 
                    onClick={() => addDraftEntry(false, true)}
                    className="py-3 border-2 border-dashed border-surface-container-highest rounded-lg flex flex-col items-center justify-center gap-0.5 label-caps opacity-60 hover:opacity-100 hover:bg-surface-container/5 hover:border-[#00e5ff]/50 transition-all group"
                  >
                    <Award className="w-4 h-4 text-[#00e5ff] group-hover:scale-110 transition-transform" /> 
                    <span className="text-[8px] sm:text-[9px] truncate w-full text-center">BE-DO-HAVE</span>
                  </button>
                </div>

                {/* Sub-Save/Sync Button placed directly below the 3 entry buttons */}
                <button 
                  onClick={handleSaveWin}
                  disabled={(!hasChanges && !isJustSaved) || !draftEntries.some(e => e.text.trim())}
                  className={`w-full h-10 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm hover:scale-[1.01] transition-all active:scale-95 mb-1 ${
                    isJustSaved
                      ? 'bg-emerald-500 text-white'
                      : (hasChanges && draftEntries.some(e => e.text.trim())
                        ? 'bg-secondary text-white shadow-md shadow-secondary/20' 
                        : 'bg-surface-container-highest text-on-surface-variant opacity-40 grayscale cursor-not-allowed')
                  }`}
                >
                  {isJustSaved ? (
                    <>
                      <Check className="w-4 h-4" />
                      {language === 'ID' ? 'Berhasil Disimpan!' : 'Successfully Saved!'}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> 
                      {hasChanges ? t.save : (language === 'ID' ? 'Sinkronisasi' : 'Sync Now')}
                    </>
                  )}
                </button>
                
                {recordFilter !== 'all' && (
                  <div className="flex items-center justify-between text-xs px-4 py-2 bg-surface-container-high/60 rounded-xl border border-surface-container-highest animate-in fade-in slide-in-from-top-2">
                    <span className="font-semibold text-on-surface-variant flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                      {recordFilter === 'habit' 
                        ? (language === 'ID' ? 'Memfilter Kebiasaan' : 'Filtering Habits Only') 
                        : recordFilter === 'entry'
                          ? (language === 'ID' ? 'Memfilter Entri Utama' : 'Filtering Main Entries Only')
                          : (language === 'ID' ? 'Memfilter Be Do Have' : 'Filtering Identity (Be Do Have) Only')}
                    </span>
                    <button 
                      onClick={() => setRecordFilter('all')} 
                      className="text-[10px] font-black uppercase text-secondary hover:text-primary transition-colors bg-surface-container px-2 py-1 rounded-lg border border-surface-container-highest"
                    >
                      {language === 'ID' ? 'LIHAT SEMUA' : 'SEE ALL'}
                    </button>
                  </div>
                )}

                {[...draftEntries]
                  .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
                  .filter(entry => {
                    if (recordFilter === 'habit') return entry.isHabitMode;
                    if (recordFilter === 'entry') return !entry.isHabitMode && !entry.isBeDoHave;
                    if (recordFilter === 'bedohave') return entry.isBeDoHave;
                    return true;
                  })
                  .map((entry, idx) => (
                  <div 
                    key={entry.id} 
                    id={`entry-${entry.id}`}
                    className={`p-8 bento-card relative group/card border-2 transition-all duration-700 ${
                      entry.isHabitMode 
                        ? 'bg-[#43A047] border-[#43A047] shadow-lg dark:bg-[#1B5E20] dark:border-[#1B5E20]' 
                        : (entry.isBeDoHave
                            ? (focusedEntryId === entry.id
                                ? 'bg-[#0091EA] border-[#0091EA] scale-[1.01] shadow-[0_0_25px_rgba(0,145,234,0.6)] dark:bg-[#01579B] dark:border-[#01579B] dark:shadow-[0_0_30px_rgba(1,87,155,0.7)] text-white'
                                : 'bg-[#0091EA] border-[#0091EA] shadow-lg dark:bg-[#01579B] dark:border-[#01579B] text-white')
                            : (focusedEntryId === entry.id 
                                ? 'border-secondary bg-secondary/[0.03] scale-[1.01] shadow-xl text-on-surface' 
                                : 'bg-surface border border-surface-container shadow-sm text-on-surface'))
                    }`}
                    onClick={() => {
                      if (focusedEntryId === entry.id) setFocusedEntryId(null);
                    }}
                  >
                    <div className="absolute top-6 right-8 flex items-center gap-2">
                      {confirmDeleteEntryId === entry.id ? (
                        <div className="flex items-center gap-2 bg-surface text-on-surface p-1.5 rounded-xl border border-surface-container-high shadow-lg animate-in fade-in slide-in-from-right-2 z-10">
                          <span className="text-[9px] font-bold text-red-600 uppercase tracking-[0.1em] ml-1">{language === 'ID' ? 'HAPUS?' : 'DELETE?'}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              removeDraftEntry(entry.id);
                              setConfirmDeleteEntryId(null);
                            }}
                            className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                          >
                            YES
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteEntryId(null);
                            }}
                            className="bg-surface-container text-on-surface-variant text-[9px] font-black px-2 py-1 rounded-lg hover:bg-surface-container-highest transition-colors"
                          >
                            NO
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteEntryId(entry.id);
                          }}
                          className={`transition-all p-1 hover:scale-110 active:scale-95 ${
                            entry.isHabitMode || entry.isBeDoHave
                              ? 'text-white opacity-40 hover:opacity-100'
                              : 'text-on-surface-variant opacity-20 hover:text-red-500 hover:opacity-100'
                          }`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    <div className="absolute top-5 left-8 flex flex-col items-start leading-none select-none">
                      <span className={`label-caps ${(entry.isHabitMode || entry.isBeDoHave) ? 'text-white opacity-80 font-bold' : 'opacity-40'}`}>
                        {entry.isBeDoHave ? 'BE-DO-HAVE' : entry.isHabitMode ? 'HABIT' : 'ENTRY'} {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                      </span>
                      <span className={`text-[9px] font-mono mt-0.5 ${(entry.isHabitMode || entry.isBeDoHave) ? 'text-white/60' : 'text-on-surface-variant/40'}`}>
                        {(() => {
                          const dateObj = entry.createdAt ? new Date(entry.createdAt) : new Date();
                          return dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
                        })()}
                      </span>
                    </div>
                    
                    {!entry.isBeDoHave && (
                      <>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDraftEntry(entry.id, { starred: !entry.starred });
                          }}
                          className={`absolute top-6 left-28 transition-all p-1 hover:scale-110 active:scale-90 ${
                            entry.starred ? (entry.isHabitMode ? 'text-white opacity-100' : 'text-secondary opacity-100') : (entry.isHabitMode ? 'text-white opacity-40 hover:opacity-70' : 'text-on-surface-variant opacity-20 hover:opacity-40')
                          }`}
                          title={entry.starred ? "Unstar" : "Star"}
                        >
                          <Star className={`w-4 h-4 ${entry.starred ? 'fill-current' : ''}`} />
                        </button>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            updateDraftEntry(entry.id, { pinned: !entry.pinned });
                          }}
                          className={`absolute top-6 left-36 transition-all p-1 hover:scale-110 active:scale-90 ${
                            entry.pinned ? (entry.isHabitMode ? 'text-white opacity-100' : 'text-secondary opacity-100') : (entry.isHabitMode ? 'text-white opacity-40 hover:opacity-70' : 'text-on-surface-variant opacity-20 hover:opacity-40')
                          }`}
                          title={entry.pinned ? "Unpin" : "Pin as Master Quote"}
                        >
                          <Pin className={`w-4 h-4 ${entry.pinned ? 'rotate-[-45deg] fill-current' : ''}`} />
                        </button>

                        <label 
                          className={`absolute top-6 left-44 transition-all p-1 hover:scale-110 active:scale-90 cursor-pointer ${
                            entry.imageUrl ? (entry.isHabitMode ? 'text-white opacity-100' : 'text-secondary opacity-100') : (entry.isHabitMode ? 'text-white opacity-40 hover:opacity-70' : 'text-on-surface-variant opacity-20 hover:opacity-40')
                          }`}
                          title={language === 'ID' ? 'Tambah Foto' : 'Add Photo'}
                        >
                          {compressingId === entry.id ? (
                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          ) : (
                            <Camera className="w-4 h-4" />
                          )}
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            disabled={compressingId !== null}
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  setCompressingId(entry.id);
                                  const compressed = await compressImage(file);
                                  updateDraftEntry(entry.id, { imageUrl: compressed });
                                } catch (err: any) {
                                  console.error("Compression failed:", err);
                                  setError(language === 'ID' ? `Gagal memproses gambar: ${err.message || 'Format tidak didukung'}` : `Failed to process image: ${err.message || 'Unsupported format'}`);
                                } finally {
                                  setCompressingId(null);
                                }
                              }
                            }}
                          />
                        </label>
                      </>
                    )}
                    
                    <div className="flex flex-col gap-4 mt-8">
                      <div className="relative">
                        {entry.isHabitMode ? (
                          <div className="flex flex-col gap-2">
                            <label className={`text-[10px] font-black uppercase tracking-widest ${entry.isHabitMode ? 'text-white opacity-80' : 'text-secondary opacity-60'}`}>
                              {language === 'ID' ? 'Pilih Kebiasaan' : 'Choose Habit'}
                            </label>
                            <div className="flex items-center gap-2">
                              <div className="relative flex-1">
                                <select 
                                  value={entry.text}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    
                                    // Habit mode entries won't auto-tag anymore according to req
                                    updateDraftEntry(entry.id, { 
                                      text: val
                                    });
                                  }}
                                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm font-medium focus:ring-0 transition-all appearance-none cursor-pointer ${
                                    entry.isHabitMode 
                                      ? 'bg-white/20 border-white/30 text-white focus:border-white' 
                                      : 'bg-surface-container-low border-surface-container-high text-[#1a1a1a] focus:border-secondary transition-colors'
                                  }`}
                                >
                                  <option value="" className="text-gray-900 bg-white">
                                    {language === 'ID' ? '-- Pilih --' : '-- Select --'}
                                  </option>
                                  {[...templates].sort((a, b) => a.localeCompare(b)).map((tmpl, tIdx) => (
                                    <option key={tIdx} value={tmpl} className="text-gray-900 bg-white">
                                      {tmpl}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {(() => {
                                const original = originalEntries.find(o => o.id === entry.id);
                                const isDirty = !original || 
                                  entry.text !== original.text || 
                                  entry.starred !== (original.starred || false) || 
                                  entry.pinned !== (original.pinned || false) ||
                                  entry.imageUrl !== original.imageUrl;
                                
                                return isDirty && (
                                  <motion.button 
                                    initial={{ opacity: 0, scale: 0.5 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveSingleWin(entry.id);
                                    }}
                                    className="p-3 rounded-xl bg-white text-[#43A047] dark:text-[#1B5E20] hover:bg-white/95 shadow-md transition-all duration-300 flex items-center justify-center shrink-0 scale-105 active:scale-95"
                                    title="Save this entry"
                                  >
                                    <Check className="w-4 h-4 font-black stroke-[3px]" />
                                  </motion.button>
                                );
                              })()}
                            </div>
                            {templates.length === 0 && (
                              <p className="text-[10px] text-error italic">
                                {language === 'ID' ? 'Belum ada habit. Atur di profil.' : 'No habits found. Add them in profile.'}
                              </p>
                            )}
                          </div>
                        ) : entry.isBeDoHave ? (
                          <div className="flex flex-col gap-3 mt-2 pr-8">
                            <input 
                              type="text"
                              value={entry.beText || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const beInput = e.target.value;
                                const doInput = entry.doText || '';
                                const haveInput = entry.haveText || '';
                                const fullText = `BE: ${beInput} | DO: ${doInput} | HAVE: ${haveInput}`;
                                updateDraftEntry(entry.id, { beText: beInput, text: fullText });
                              }}
                              placeholder={language === 'ID' ? 'BE: SIAPA ANDA / PERAN DIRI (CONTOH: PENULIS)' : 'BE: WHO TO BE / ROLE (E.G. WRITER)'}
                              className="w-full bg-[#001e28]/50 border border-[#00e5ff]/25 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white placeholder-cyan-100/40 outline-none focus:bg-[#001e28]/70 focus:border-[#00e5ff]/50 transition-all"
                            />
                            
                            <input 
                              type="text"
                              value={entry.doText || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const beInput = entry.beText || '';
                                const doInput = e.target.value;
                                const haveInput = entry.haveText || '';
                                const fullText = `BE: ${beInput} | DO: ${doInput} | HAVE: ${haveInput}`;
                                updateDraftEntry(entry.id, { doText: doInput, text: fullText });
                              }}
                              placeholder={language === 'ID' ? 'DO: ACTION / TINDAKAN (CONTOH: MENULIS 3 HALAMAN)' : 'DO: ACTION / DEED (E.G. WRITE 3 PAGES)'}
                              className="w-full bg-[#001e28]/50 border border-[#00e5ff]/25 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white placeholder-cyan-100/40 outline-none focus:bg-[#001e28]/70 focus:border-[#00e5ff]/50 transition-all"
                            />

                            <input 
                              type="text"
                              value={entry.haveText || ''}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                const beInput = entry.beText || '';
                                const doInput = entry.doText || '';
                                const haveInput = e.target.value;
                                const fullText = `BE: ${beInput} | DO: ${doInput} | HAVE: ${haveInput}`;
                                updateDraftEntry(entry.id, { haveText: haveInput, text: fullText });
                              }}
                              placeholder={language === 'ID' ? 'HAVE: OUTCOME / HASIL (CONTOH: HUBUNGAN HARMONIS)' : 'HAVE: OUTCOME / ASSET (E.G. HARMONIOUS CONNECTION)'}
                              className="w-full bg-[#001e28]/50 border border-[#00e5ff]/25 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white placeholder-cyan-100/40 outline-none focus:bg-[#001e28]/70 focus:border-[#00e5ff]/50 transition-all"
                            />
                          </div>
                        ) : (
                          <>
                            <div className="relative group/input">
                              <textarea 
                                value={entry.text}
                                onChange={(e) => updateDraftEntry(entry.id, { text: e.target.value })}
                                placeholder={language === 'ID' ? 'Apa kemenanganmu?' : 'What was your win?'}
                                rows={3}
                                className="w-full bg-transparent border-none focus:ring-0 resize-none placeholder:text-surface-container-highest text-lg p-0 pr-8 font-sans font-medium"
                              />
                            </div>
                            
                            {compressingId === entry.id && (
                              <div className="relative w-full aspect-video rounded-2xl bg-surface-container overflow-hidden mb-4 flex flex-col items-center justify-center gap-2 border border-dashed border-primary/20 shadow-inner">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <span className="text-xs text-primary font-medium">
                                  {language === 'ID' ? 'Mengompres foto...' : 'Compressing photo...'}
                                </span>
                              </div>
                            )}

                            {entry.imageUrl && (
                              <div 
                                onClick={() => setPreviewImageUrl(entry.imageUrl || null)}
                                className="relative w-full aspect-video rounded-2xl overflow-hidden mb-4 group/image shadow-md cursor-zoom-in"
                              >
                                <img src={entry.imageUrl} alt="Win attachment" className="w-full h-full object-cover" />
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateDraftEntry(entry.id, { imageUrl: undefined });
                                  }}
                                  className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full backdrop-blur-md opacity-0 group-hover/image:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}

                            {entry.text && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateDraftEntry(entry.id, { text: '' });
                                }}
                                className="absolute top-0 right-0 p-1 text-on-surface-variant/40 hover:text-error transition-colors"
                                title="Clear"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </>
                        )}
                      </div>
                      
                      {!entry.isHabitMode && (
                        <div className={`flex flex-col gap-3 pt-4 border-t ${entry.isBeDoHave ? 'border-white/25' : 'border-surface-container-high'}`}>
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map(tag => (
                            <div key={tag} className={`flex items-center gap-1 px-3 py-1 rounded-full label-caps text-[9px] ${
                              entry.isBeDoHave 
                                ? 'bg-white/20 text-white border border-white/30' 
                                : 'bg-secondary/10 text-secondary'
                            }`}>
                              <button 
                                onClick={() => {
                                  setSearchQuery(tag);
                                  setActiveView('stats');
                                  setTimeout(() => {
                                    document.getElementById('explore-wins-header')?.scrollIntoView({ behavior: 'smooth' });
                                  }, 100);
                                }}
                                className="hover:underline"
                              >
                                {tag}
                              </button>
                              <button onClick={() => removeTagFromEntry(entry.id, tag)} className={`p-0.5 ${
                                entry.isBeDoHave ? 'text-white/80 hover:text-white' : 'hover:text-primary'
                              }`}>
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                        
                        <div className="flex items-center gap-2 relative">
                          <Plus className={`w-4 h-4 ${entry.isBeDoHave ? 'text-white' : 'text-on-surface-variant'}`} />
                          <div className="relative flex-1 flex items-center gap-2">
                            <input 
                              placeholder="Add Tag (e.g. #Family)"
                              className={`text-xs font-bold uppercase tracking-wider w-full outline-none transition-colors ${
                                entry.isBeDoHave 
                                  ? 'bg-[#001e28]/50 border border-[#00e5ff]/25 text-white placeholder-cyan-100/40 focus:bg-[#001e28]/70 focus:border-[#00e5ff]/40 rounded-full px-5 py-2.5' 
                                  : 'bg-surface-container-low text-on-surface focus:bg-surface-container rounded-lg px-4 py-2'
                              }`}
                              value={tagInput[entry.id] || ''}
                              onChange={(e) => setTagInput({ ...tagInput, [entry.id]: e.target.value })}
                              onKeyDown={(e) => e.key === 'Enter' && addTagToEntry(entry.id)}
                            />
                            
                            {(() => {
                              const original = originalEntries.find(o => o.id === entry.id);
                              const isDirty = !original || 
                                entry.text !== original.text || 
                                entry.starred !== (original.starred || false) || 
                                entry.pinned !== (original.pinned || false) ||
                                entry.imageUrl !== original.imageUrl ||
                                (entry.isBeDoHave && (
                                  entry.beText !== (original.beText || '') ||
                                  entry.doText !== (original.doText || '') ||
                                  entry.haveText !== (original.haveText || '')
                                )) ||
                                JSON.stringify([...(entry.tags || [])].sort()) !== JSON.stringify([...(original.tags || [])].sort());
                              
                              return isDirty && (
                                <motion.button 
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveSingleWin(entry.id);
                                  }}
                                  className={`shadow-md transition-all duration-300 flex items-center justify-center shrink-0 ${
                                    entry.isBeDoHave 
                                      ? 'p-2.5 rounded-full bg-[#0091EA] text-white hover:bg-[#00a2ff] shadow-[#0091EA]/30 scale-105 active:scale-95' 
                                      : entry.isHabitMode 
                                        ? 'p-1.5 rounded-lg bg-white text-[#6FCF97] hover:bg-white/90' 
                                        : 'p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600'
                                  }`}
                                  title="Save this entry"
                                >
                                  <Check className="w-4 h-4 font-black stroke-[3px]" />
                                </motion.button>
                              );
                            })()}
                          </div>
                          
                          {/* Tag Suggestions */}
                          {tagInput[entry.id] && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-surface shadow-xl rounded-lg border border-surface-container-high z-50 max-h-32 overflow-y-auto">
                              {registeredTags
                                .filter(t => t.name.toLowerCase().includes(tagInput[entry.id].toLowerCase()))
                                .map(tag => (
                                  <button 
                                    key={tag.id}
                                    onClick={() => {
                                      const formattedTag = tag.name.startsWith('#') ? tag.name.toUpperCase() : `#${tag.name.toUpperCase()}`;
                                      if (!entry.tags.includes(formattedTag)) {
                                        updateDraftEntry(entry.id, { tags: [...entry.tags, formattedTag] });
                                      }
                                      setTagInput({ ...tagInput, [entry.id]: '' });
                                    }}
                                    className="w-full text-left px-4 py-2 text-[10px] font-bold hover:bg-surface-container-low transition-colors"
                                  >
                                    {tag.name}
                                  </button>
                                ))}
                                {!registeredTags.some(t => t.name.toLowerCase() === tagInput[entry.id].toLowerCase()) && (
                                  <button 
                                    onClick={() => addTagToEntry(entry.id)}
                                    className="w-full text-left px-4 py-2 text-[10px] font-bold text-secondary hover:bg-surface-container-low transition-colors border-t border-surface-container-high"
                                  >
                                    + ADD AS NEW TAG: {tagInput[entry.id].toUpperCase()}
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}



                  </div>
                </div>
              ))}
            </div>

              <button 
                onClick={handleSaveWin}
                disabled={(!hasChanges && !isJustSaved) || !draftEntries.some(e => e.text.trim())}
                className={`w-full h-12 rounded-full font-bold text-sm flex items-center justify-center gap-2 shadow-xl hover:scale-[1.02] transition-all active:scale-95 sticky bottom-4 z-10 ${
                  isJustSaved
                    ? 'bg-emerald-500 text-white'
                    : (hasChanges && draftEntries.some(e => e.text.trim())
                      ? 'bg-secondary text-white' 
                      : 'bg-surface-container-highest text-on-surface-variant opacity-50 grayscale cursor-not-allowed')
                }`}
              >
                {isJustSaved ? (
                  <>
                    <Check className="w-5 h-5" />
                    {language === 'ID' ? 'Tersimpan!' : 'Saved!'}
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-5 h-5" /> 
                    {hasChanges ? t.save : (language === 'ID' ? 'Sinkron' : 'Synced')}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {activeView === 'stats' && (
            <motion.div 
              key="stats"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col gap-8"
            >
              <div className="flex bg-surface-container p-1 rounded-full w-full">
                <button 
                  onClick={() => setStatsSubView('stats')}
                  className={`flex-1 py-3 rounded-full label-caps text-[10px] transition-all ${statsSubView === 'stats' ? 'bg-surface shadow-sm font-bold' : 'opacity-40'}`}
                >
                  {language === 'ID' ? 'Wawasan' : 'Insights'}
                </button>
                <button 
                  onClick={() => setStatsSubView('tags')}
                  className={`flex-1 py-3 rounded-full label-caps text-[10px] transition-all ${statsSubView === 'tags' ? 'bg-surface shadow-sm font-bold' : 'opacity-40'}`}
                >
                  {language === 'ID' ? 'Daftar Tag' : 'Tag Registry'}
                </button>
              </div>

              {statsSubView === 'stats' ? (
                <div className="flex flex-col gap-6">
                  <header className="flex items-center justify-between">
                    <h2 className="editorial-header mt-1">{language === 'ID' ? '7 Tag Teratas' : 'Top 7 Tags'}</h2>
                    <button 
                      onClick={() => document.getElementById('explore-wins-header')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-[9px] font-black uppercase tracking-widest text-primary border border-primary/20 px-3 py-1 rounded-full hover:bg-primary/5 transition-colors"
                    >
                      {language === 'ID' ? 'Eksplor Kemenangan' : 'Explore Wins'}
                    </button>
                  </header>
                  
                  <div className="bg-surface rounded-lg p-4 bento-card grid grid-cols-1 gap-2">
                    {topTags.map((item, idx) => (
                      <div key={item.name} className="flex items-center gap-3 py-1 border-b border-surface-container last:border-0">
                        <div className="min-w-[80px]">
                          <span className="font-bold text-[11px] tracking-tight">{item.name}</span>
                        </div>
                        <div className="flex-1 h-1.5 bg-surface-container-high rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progress}%` }}
                            className={`h-full ${idx === 0 ? 'bg-primary' : idx < 3 ? 'bg-secondary' : 'bg-tertiary'} rounded-full`}
                          />
                        </div>
                        <div className="min-w-[40px] text-right flex items-center justify-end gap-2">
                          <span className="text-[9px] font-bold opacity-60 uppercase">{item.count}</span>
                          <button 
                            onClick={() => {
                              setSearchQuery(item.name);
                              document.getElementById('explore-wins-header')?.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="p-1 hover:bg-surface-container-high rounded transition-colors text-primary"
                            title="Explore this tag"
                          >
                            <Search className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    {registeredTags.length === 0 && (
                      <div className="text-center py-4 opacity-40 italic text-sm">No data yet.</div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6">
                  <header>
                    <span className="label-caps text-tertiary">Management</span>
                    <h2 className="editorial-header mt-1">Tag Registry</h2>
                  </header>
                  <div className="bg-surface p-4 rounded-xl bento-card">
                    <div className="flex flex-wrap gap-2">
                      {registeredTags.map(tag => {
                        const winCount = wins.filter(w => w.tags.includes(tag.name)).length;
                        const isUsed = winCount > 0;
                        const isConfirming = confirmDelete === tag.id;
                        
                        return (
                          <div 
                            key={tag.id} 
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all border ${
                              isConfirming 
                                ? 'bg-error/10 border-error/20' 
                                : 'bg-surface-container-low border-surface-container-high hover:border-primary/30'
                            }`}
                          >
                            {editingTag?.id === tag.id ? (
                              <div className="flex items-center gap-1">
                                <input 
                                  autoFocus
                                  className="bg-transparent text-[10px] font-bold uppercase outline-none w-24"
                                  value={editingTag.name}
                                  onChange={(e) => setEditingTag({ ...editingTag, name: e.target.value })}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleEditTag(tag.name, editingTag.name);
                                    if (e.key === 'Escape') setEditingTag(null);
                                  }}
                                />
                                <button onClick={() => handleEditTag(tag.name, editingTag.name)} className="text-secondary hover:scale-110 transition-transform">
                                  <CheckCircle2 className="w-3 h-3" />
                                </button>
                              </div>
                            ) : isConfirming ? (
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-bold text-error uppercase">Are you sure?</span>
                                <div className="flex gap-1">
                                  <button onClick={() => handleDeleteTag(tag.name)} className="bg-error text-white h-5 w-5 rounded flex items-center justify-center">
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                  <button onClick={() => setConfirmDelete(null)} className="bg-surface-container-high text-on-surface h-5 w-5 rounded flex items-center justify-center">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <button 
                                  onClick={() => {
                                    setSearchQuery(tag.name);
                                    document.getElementById('explore-wins-header')?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="flex flex-col text-left hover:opacity-70 transition-opacity"
                                >
                                  <span className="font-bold text-[10px] tracking-tight">{tag.name}</span>
                                  <span className="text-[8px] opacity-40 font-bold uppercase leading-none">{winCount}</span>
                                </button>
                                <div className="flex items-center gap-1 border-l border-surface-container-high pl-1 ml-1">
                                  <button 
                                    onClick={() => setEditingTag({ id: tag.id, name: tag.name })}
                                    className="p-1 text-primary hover:bg-primary/5 rounded transition-colors"
                                  >
                                    <Star className="w-3 h-3" />
                                  </button>
                                  <button 
                                    onClick={() => setConfirmDelete(tag.id)}
                                    className="p-1 rounded transition-colors text-error hover:bg-error/5"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {registeredTags.length === 0 && (
                        <div className="w-full text-center py-8 opacity-40 italic text-sm">No tags found.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <header id="explore-wins-header" className="mt-2 mb-0">
                <span className="label-caps text-tertiary">Archive</span>
                <h2 className="editorial-header mt-1">Explore Wins</h2>
              </header>

              <div className="flex flex-col gap-3">
                <div className="relative w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant" />
                  <input 
                    placeholder="Search by #Mindful, #Negotiate..." 
                    className="w-full bg-surface py-3.5 pl-12 pr-12 rounded-full border-none shadow-sm focus:ring-2 focus:ring-secondary/20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-on-surface-variant hover:text-on-surface transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                {searchQuery.trim().length > 2 && (
                  <div className="flex items-center gap-2 px-4 h-6">
                    {isSearchingSemantically ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin text-primary" />
                        <span className="text-[9px] font-bold text-primary uppercase tracking-widest animate-pulse">Analyzing meaning...</span>
                      </>
                    ) : queryEmbedding ? (
                      <>
                        <Zap className="w-3 h-3 text-secondary fill-secondary" />
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">Semantic search active</span>
                      </>
                    ) : null}
                  </div>
                )}
                
                <div className="flex gap-2">
                  <button 
                    onClick={() => setStarredOnly(!starredOnly)}
                    className={`h-11 px-4 rounded-full shadow-sm flex items-center gap-2 transition-all ${
                      starredOnly ? 'bg-secondary text-white border-transparent' : 'bg-surface text-on-surface-variant border border-surface-container hover:bg-surface-container-low transition-colors'
                    }`}
                    title={starredOnly ? "Show All" : "Show Starred Only"}
                  >
                    <Star className={`w-4 h-4 ${starredOnly ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'ID' ? 'Bintang' : 'Starred'}</span>
                  </button>

                  <button 
                    onClick={() => setPinnedOnly(!pinnedOnly)}
                    className={`h-11 px-4 rounded-full shadow-sm flex items-center gap-2 transition-all ${
                      pinnedOnly ? 'bg-primary text-white border-transparent' : 'bg-surface text-on-surface-variant border border-surface-container hover:bg-surface-container-low transition-colors'
                    }`}
                    title={pinnedOnly ? "Show All" : "Show Pinned Only"}
                  >
                    <Pin className={`w-4 h-4 ${pinnedOnly ? 'fill-current' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">{language === 'ID' ? 'Pin' : 'Pinned'}</span>
                  </button>

                  <button 
                    onClick={() => setExploreSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                    className={`h-11 px-4 rounded-full shadow-sm flex items-center gap-2 transition-all border ${
                      exploreSortOrder === 'asc' ? 'bg-secondary text-white border-transparent' : 'bg-surface text-on-surface-variant border-surface-container hover:bg-surface-container-low transition-colors'
                    }`}
                    title={exploreSortOrder === 'desc' ? "Newest First" : "Oldest First"}
                  >
                    <ArrowUpDown className={`w-4 h-4 transition-transform ${exploreSortOrder === 'asc' ? 'rotate-180' : ''}`} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">
                      {exploreSortOrder === 'desc' ? (language === 'ID' ? 'Terbaru' : 'Newest') : (language === 'ID' ? 'Terlama' : 'Oldest')}
                    </span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {filteredWins.map(win => {
                  const d = (win.createdAt as any).toDate ? (win.createdAt as any).toDate() : new Date(win.createdAt);
                  return (
                  <div 
                    key={win.id} 
                    onClick={() => {
                      const selectedD = new Date(d);
                      selectedD.setHours(0,0,0,0);
                      setSelectedDate(selectedD);
                      setActiveView('record');
                      setFocusedEntryId(win.id);
                      // Give time for view to switch and component to mount before scrolling
                      setTimeout(() => {
                        const el = document.getElementById(`entry-${win.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 100);
                    }}
                    className={`p-6 rounded-lg bento-card cursor-pointer hover:translate-y-[-2px] transition-transform active:scale-[0.98] overflow-hidden ${
                      win.isHabitMode 
                        ? 'bg-[#43A047] border-[#43A047] dark:bg-[#1B5E20] dark:border-[#1B5E20]' 
                        : (win.isBeDoHave
                            ? 'bg-[#0091EA] border-[#0091EA] shadow-[0_0_15px_rgba(0,145,234,0.3)] dark:bg-[#01579B] dark:border-[#01579B] dark:shadow-[0_0_25px_rgba(1,87,155,0.4)] text-white'
                            : 'bg-surface border border-surface-container')
                    }`}
                  >
                    {win.imageUrl && (
                      <div 
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewImageUrl(win.imageUrl || null);
                        }}
                        className="w-full h-32 -mx-6 -mt-6 mb-4 overflow-hidden cursor-zoom-in"
                      >
                        <img src={win.imageUrl} alt={win.text} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                      </div>
                    )}
                    <div className="flex flex-col gap-3 mb-4">
                      <div className="flex justify-between items-center">
                        <span className={`label-caps opacity-60 text-[10px] ${(win.isHabitMode || win.isBeDoHave) ? 'text-white' : 'text-on-surface-variant'}`}>
                          {d.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase()}
                        </span>
                        <div className="flex items-center gap-2">
                          {(win as any).similarity > 0.4 && (
                            <div className="flex items-center gap-1 bg-secondary/10 px-1.5 py-0.5 rounded text-secondary animate-in fade-in zoom-in duration-300">
                              <Zap className="w-2.5 h-2.5 fill-current" />
                              <span className="text-[8px] font-black">{Math.round((win as any).similarity * 100)}%</span>
                            </div>
                          )}
                          {win.starred && <Star className={`w-3.5 h-3.5 fill-current ${(win.isHabitMode || win.isBeDoHave) ? 'text-white' : 'text-secondary'}`} />}
                          {win.pinned && <Pin className={`w-3.5 h-3.5 fill-current rotate-[-45deg] ${(win.isHabitMode || win.isBeDoHave) ? 'text-white' : 'text-secondary'}`} />}
                          
                          {/* Play/Stop button for reading text loudly in a wise tone */}
                          {win.pinned && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const textToSpeak = win.isBeDoHave 
                                  ? `${win.beText ? 'Identity: ' + win.beText : ''}. ${win.doText ? 'Action: ' + win.doText : ''}. ${win.haveText ? 'Outcome: ' + win.haveText : ''}`
                                  : win.text;
                                toggleSpeech(win.id, textToSpeak);
                              }}
                              className={`p-1 rounded-full transition-all duration-300 transform active:scale-90 hover:scale-110 flex items-center justify-center shrink-0 ${
                                currentlySpeakingId === win.id
                                  ? 'bg-[#FF9100] text-slate-950 scale-110 animate-pulse shadow-[0_0_10px_rgba(255,145,0,0.5)]'
                                  : (win.isHabitMode || win.isBeDoHave)
                                    ? 'bg-white/20 hover:bg-white/40 text-white'
                                    : 'bg-secondary/10 hover:bg-secondary/20 text-secondary'
                              }`}
                              title={currentlySpeakingId === win.id ? 'Stop' : 'Listen with Wise Voice'}
                            >
                              {currentlySpeakingId === win.id ? (
                                <Square className="w-3 h-3 fill-current" />
                              ) : (
                                <Play className="w-3 h-3 fill-current ml-[0.5px]" />
                              )}
                            </button>
                          )}

                          <div className={`w-1.5 h-1.5 rounded-full ${(win.isHabitMode || win.isBeDoHave) ? 'bg-white/30' : 'bg-secondary/30'}`} />
                        </div>
                      </div>
                      {!win.isHabitMode && win.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {win.tags.map(tag => (
                            <button 
                              key={tag} 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(tag);
                                document.getElementById('explore-wins-header')?.scrollIntoView({ behavior: 'smooth' });
                              }}
                              className={`${
                                win.isBeDoHave
                                  ? 'bg-[#00e5ff]/20 text-[#00e5ff] hover:bg-[#00e5ff]/30'
                                  : 'bg-secondary/10 text-secondary hover:bg-secondary/20'
                              } px-2.5 py-1 rounded-full text-[8.5px] font-bold uppercase tracking-tight transition-colors`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {win.isBeDoHave ? (
                      <div className="flex flex-col gap-2.5 mt-2">
                        {win.beText && (
                          <div className="flex items-start gap-2.5 bg-[#002c3c] border border-[#00e5ff]/30 px-3.5 py-2.5 rounded-xl">
                            <span className="text-[9px] font-black bg-[#00e5ff] text-slate-950 rounded px-1.5 py-0.5 tracking-wider shrink-0 mt-0.5">BE</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black tracking-wider uppercase text-[#00e5ff]/70">{language === 'ID' ? 'Identitas / Peran' : 'Identity / Role'}</span>
                              <p className="text-sm font-semibold text-white leading-normal">{win.beText}</p>
                            </div>
                          </div>
                        )}
                        {win.doText && (
                          <div className="flex items-start gap-2.5 bg-[#08222b]/60 border border-blue-500/30 px-3.5 py-2.5 rounded-xl">
                            <span className="text-[9px] font-black bg-blue-500 text-white rounded px-1.5 py-0.5 tracking-wider shrink-0 mt-0.5">DO</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black tracking-wider uppercase text-blue-300/70">{language === 'ID' ? 'Tindakan / Action' : 'Action / Activity'}</span>
                              <p className="text-sm font-semibold text-white leading-normal">{win.doText}</p>
                            </div>
                          </div>
                        )}
                        {win.haveText && (
                          <div className="flex items-start gap-2.5 bg-[#08222b]/60 border border-emerald-500/30 px-3.5 py-2.5 rounded-xl">
                            <span className="text-[9px] font-black bg-emerald-500 text-white rounded px-1.5 py-0.5 tracking-wider shrink-0 mt-0.5">HAVE</span>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[8px] font-black tracking-wider uppercase text-emerald-300/70">{language === 'ID' ? 'Hasil / Pencapaian' : 'Outcome / Gain'}</span>
                              <p className="text-sm font-semibold text-white leading-normal">{win.haveText}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className={`text-xl font-serif italic leading-snug ${win.isHabitMode ? 'text-white' : 'text-on-surface'}`}>{win.text}</p>
                    )}
                    {win.reflections && (
                      <p className={`text-sm border-l-2 pl-4 italic mt-3 ${
                        win.isBeDoHave 
                          ? 'text-cyan-100/80 border-[#00e5ff]/30' 
                          : 'text-on-surface-variant border-surface-container-high'
                      }`}>
                        {win.reflections}
                      </p>
                    )}
                  </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeView === 'friends' && (
            <motion.div 
              key="friends"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-stack-lg"
            >
              <div className="flex flex-col gap-2">
                <h2 className="text-4xl font-bold tracking-tight">Leaderboard</h2>
                <p className="text-on-surface-variant">See how your community is staying on top.</p>
              </div>

              <div className="bg-surface rounded-lg bento-card overflow-hidden">
                {[
                  { name: 'Sarah Chen', streak: 42, avatar: 'https://picsum.photos/seed/sarah/100/100', rank: 1, active: true },
                  { name: user.displayName || 'Me', streak: streakCount, avatar: user.photoURL || 'https://picsum.photos/seed/streak-user/100/100', rank: 2, me: true },
                  { name: 'Marcus Bell', streak: 8, avatar: 'https://picsum.photos/seed/marcus/100/100', rank: 3, active: false }
                ].map((friend, idx) => (
                  <div 
                    key={friend.name} 
                    className={`flex items-center justify-between p-4 ${idx !== 2 ? 'border-bottom border-surface-container-high' : ''} ${friend.me ? 'bg-secondary/5' : ''}`}
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-6 text-center font-bold font-serif italic text-xl ${friend.rank === 1 ? 'text-yellow-500' : 'text-on-surface-variant'}`}>
                        0{friend.rank}
                      </span>
                      <div className="relative">
                        <img src={friend.avatar} className="w-12 h-12 rounded-full border-2 border-surface-container-highest" referrerPolicy="no-referrer" />
                        {friend.active && <div className="absolute bottom-0 right-0 w-3 h-3 bg-secondary rounded-full border-2 border-surface" />}
                      </div>
                      <div>
                        <p className="font-bold">{friend.name} {friend.me && <span className="label-caps text-[8px] ml-1 bg-primary text-white px-1.5 py-0.5 rounded">YOU</span>}</p>
                        <p className="label-caps text-[10px] opacity-60">Last win recorded 2h ago</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold font-serif italic leading-none">{friend.streak}</p>
                      <p className="label-caps text-[8px] opacity-60">WIN STREAK</p>
                    </div>
                  </div>
                ))}
              </div>

              <button className="flex items-center justify-center gap-2 p-4 label-caps border border-dashed border-surface-container-highest rounded-lg opacity-60 hover:opacity-100 transition-opacity">
                <Plus className="w-4 h-4" /> Invite Friends
              </button>
            </motion.div>
          )}

          {activeView === 'profile' && (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col gap-stack-lg"
            >
              <header className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1">
                  <span className="label-caps text-secondary">{language === 'ID' ? 'Profil & Pengaturan' : 'Profile & Settings'}</span>
                  <h1 className="editorial-header">{user?.displayName || 'User'}</h1>
                  <p className="text-on-surface-variant text-sm">{user?.email}</p>
                  <button 
                    onClick={() => setShowChangePasswordModal(true)}
                    className="text-primary text-[10px] font-bold uppercase tracking-wider text-left mt-1 hover:underline active:scale-95 transition-all cursor-pointer w-fit"
                  >
                    {language === 'ID' ? 'Ubah Password' : 'Change Password'}
                  </button>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button
                    onClick={() => document.getElementById('csv-import-input')?.click()}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-surface text-on-surface hover:bg-surface-container border border-surface-container rounded-full font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title={language === 'ID' ? 'Impor Kemenangan dari File Excel atau CSV' : 'Import Wins from Excel or CSV File'}
                  >
                    <Upload className="w-3.5 h-3.5 opacity-70" />
                    <span>{language === 'ID' ? 'Impor Excel / CSV' : 'Import Excel / CSV'}</span>
                  </button>
                  <input 
                    type="file" 
                    id="csv-import-input" 
                    accept=".csv,.xlsx,.xls" 
                    onChange={handleImportExcelOrCSV} 
                    className="hidden" 
                  />
                  <button
                    onClick={handleExportData}
                    className="flex items-center justify-center gap-2 px-3.5 py-2 bg-surface text-on-surface hover:bg-surface-container border border-surface-container rounded-full font-bold text-[9px] uppercase tracking-wider active:scale-95 transition-all cursor-pointer whitespace-nowrap"
                    title={language === 'ID' ? 'Ekspor ke Excel / CSV Lokal' : 'Export to Local Excel / CSV'}
                  >
                    <Download className="w-3.5 h-3.5 opacity-70" />
                    <span>CSV / Excel</span>
                  </button>
                  <button
                    onClick={exportToGoogleSheets}
                    disabled={isExportingToSheets}
                    className="flex items-center justify-center gap-2 px-4.5 py-2.5 bg-gradient-to-r from-emerald-600 to-[#1B5E20] text-white rounded-full font-bold text-[9px] uppercase tracking-wider shadow-lg hover:shadow-emerald-500/10 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                    title={language === 'ID' ? 'Ekspor data ke Google Sheets di Google Drive Anda' : 'Export data to Google Sheets on your Google Drive'}
                  >
                    <svg className={`w-3.5 h-3.5 ${isExportingToSheets ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                      {isExportingToSheets ? (
                        <path d="M12 4V2C6.48 2 2 6.48 2 12h2c0-4.41 3.59-8 8-8z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      ) : (
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/>
                      )}
                    </svg>
                    <span>{isExportingToSheets ? (language === 'ID' ? 'Mengekspor...' : 'Exporting...') : 'Google Sheets'}</span>
                  </button>
                </div>
              </header>

              {/* Weekly Activity Chart */}
              <section className="bg-surface rounded-[40px] p-8 shadow-sm flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <h3 className="label-caps opacity-40 uppercase tracking-widest">{language === 'ID' ? 'AKTIVITAS' : 'ACTIVITY'}</h3>
                    <p className="text-2xl font-bold text-on-surface">{language === 'ID' ? 'Aktivitas Mingguan' : 'Weekly Activity'}</p>
                  </div>
                  <div className="bg-primary/10 px-4 py-2 rounded-2xl">
                    <span className="text-primary font-bold text-sm">
                      {habitActivityData.reduce((acc, d) => acc + d.count, 0)} Total
                    </span>
                  </div>
                </div>
                
                <div className="flex items-end justify-between h-24 gap-2 px-2">
                  {habitActivityData.map((day, i) => {
                    const maxCount = Math.max(...habitActivityData.map(d => d.count), 1);
                    const height = (day.count / maxCount) * 100;
                    const colors = [
                      'bg-primary', 
                      'bg-orange-500', 
                      'bg-blue-500', 
                      'bg-purple-500', 
                      'bg-rose-500', 
                      'bg-emerald-500',
                      'bg-amber-500'
                    ];
                    
                    return (
                      <div key={i} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className="w-full relative h-16 flex items-end">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${Math.max(day.count > 0 ? 10 : 0, height)}%` }}
                            className={`w-full rounded-t-lg transition-all duration-500 relative ${day.isToday ? 'bg-primary' : colors[i % colors.length]}`}
                          >
                             {day.count > 0 && (
                               <span className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-bold opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                 {day.count} Habits
                               </span>
                             )}
                          </motion.div>
                        </div>
                        <span className={`text-[10px] font-bold ${day.isToday ? 'text-primary font-black' : 'opacity-40'}`}>{day.label}</span>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Master Habit */}
              <section className="bg-surface p-5 bento-card flex flex-col gap-4">
                <button 
                  onClick={() => setIsHabitsExpanded(!isHabitsExpanded)}
                  className="flex items-center justify-between w-full text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="label-caps">{language === 'ID' ? 'Master Habit' : 'Master Habit'}</h2>
                    {fetchingAll && (
                      <span className="text-[10px] text-secondary animate-pulse">
                        {language === 'ID' ? 'Memuat data lengkap...' : 'Loading full data...'}
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform duration-300 ${isHabitsExpanded ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence initial={false}>
                  {isHabitsExpanded && (
                    <motion.div
                      key="habits-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden flex flex-col gap-4"
                    >
                      {/* Creator Input */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="relative flex-1">
                          <input 
                            type="text" 
                            value={newTemplate}
                            onChange={(e) => setNewTemplate(e.target.value)}
                            placeholder={language === 'ID' ? 'Tambah habit...' : 'Add habit...'}
                            className="bg-surface-container rounded-full px-4 pr-10 py-1.5 text-xs border-none focus:ring-1 focus:ring-primary w-full"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTemplate()}
                          />
                          {newTemplate && (
                            <button 
                              onClick={() => setNewTemplate('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-on-surface-variant/40 hover:text-error transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <button 
                          onClick={handleAddTemplate}
                          className="min-w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {templates.length === 0 ? (
                          <p className="text-[10px] opacity-40 italic text-center py-4">
                            {language === 'ID' ? 'Belum ada habit.' : 'No habits yet.'}
                          </p>
                        ) : (
                          [...templates]
                            .sort((a, b) => (habitStats[b]?.count || 0) - (habitStats[a]?.count || 0))
                            .map((tmpl, idx) => {
                              const stat = habitStats[tmpl] || { count: 0, streak: 0, history: Array(30).fill(false) };
                              const tmplIdx = templates.indexOf(tmpl);
                              const isSelected = currentMasterHabit === tmpl;

                              return (
                                <div 
                                  key={idx} 
                                  onClick={() => setSelectedMasterHabit(tmpl)}
                                  className={`flex items-center justify-between p-3.5 bg-surface-container rounded-2xl group hover:bg-surface-container-high transition-all cursor-pointer ${
                                    isSelected ? 'ring-1 ring-primary/20 bg-surface-container-high' : ''
                                  }`}
                                >
                                  <div className="flex items-center gap-3 flex-1 select-none">
                                    <div className={`w-4 h-4 rounded-full border-2 transition-all flex items-center justify-center shrink-0 ${
                                      isSelected ? 'border-primary bg-primary/5' : 'border-on-surface-variant/30'
                                    }`}>
                                      {isSelected && (
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-on-surface">{tmpl}</span>
                                  </div>

                                  {confirmDeleteTemplateIndex === tmplIdx ? (
                                    <div className="flex items-center gap-2 bg-surface text-on-surface p-1.5 rounded-xl border border-surface-container-high shadow-lg animate-in fade-in slide-in-from-right-2 z-10" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-[9px] font-bold text-red-600 uppercase tracking-[0.1em] ml-1">
                                        {language === 'ID' ? 'HAPUS?' : 'DELETE?'}
                                      </span>
                                      <button
                                        onClick={() => {
                                          handleRemoveTemplate(tmplIdx);
                                          setConfirmDeleteTemplateIndex(null);
                                        }}
                                        className="bg-red-600 text-white text-[9px] font-black px-2 py-1 rounded-lg hover:bg-red-700 transition-colors shadow-sm"
                                      >
                                        YES
                                      </button>
                                      <button
                                        onClick={() => setConfirmDeleteTemplateIndex(null)}
                                        className="bg-surface-container text-on-surface-variant text-[9px] font-black px-2 py-1 rounded-lg hover:bg-surface-container-highest transition-colors"
                                      >
                                        NO
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                                      <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-0.5 rounded-full font-bold">
                                        {stat.count} wins
                                      </span>
                                      <button 
                                        onClick={() => setConfirmDeleteTemplateIndex(tmplIdx)}
                                        className="text-error opacity-40 md:opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-error/10 rounded"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              );
                            })
                        )}
                      </div>

                      {/* Unified Contribution Heatmap Grid below Master Habit selection */}
                      {currentMasterHabit && (
                        <div className="mt-2 p-5 bg-surface-container-low dark:bg-surface-container/50 border border-surface-container/80 rounded-[28px] flex flex-col gap-4 shadow-sm">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="text-xl font-black text-on-surface tracking-tight">
                                {masterHabitStreakData.currentStreak} {language === 'ID' ? 'Hari Beruntun' : 'Day Streak'}
                              </p>
                              <p className="text-[9px] font-bold text-emerald-500 mt-1 uppercase tracking-widest flex items-center gap-1">
                                <span>🔥</span> {language === 'ID' ? 'Aktif' : 'Active'}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="label-caps text-[9px] text-on-surface-variant/50 font-bold uppercase tracking-wider block">
                                {language === 'ID' ? 'REKOR TERBANYAK' : 'LONGEST STREAK'}
                              </span>
                              <span className="text-xs font-black text-on-surface flex items-center justify-end gap-1 mt-0.5">
                                {masterHabitStreakData.longestStreak} {language === 'ID' ? 'HARI' : 'DAYS'}
                              </span>
                            </div>
                          </div>

                          {/* Monthly Calendar Selection Header */}
                          <div className="flex items-center justify-between bg-surface-container-high/40 p-2.5 rounded-2xl border border-surface-container/30">
                            <button
                              onClick={() => setCalendarMonth(prev => {
                                const d = new Date(prev);
                                d.setMonth(d.getMonth() - 1);
                                return d;
                              })}
                              className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00E676]">
                              {calendarMonth.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US', { month: 'long', year: 'numeric' })}
                            </span>
                            <button
                              onClick={() => setCalendarMonth(prev => {
                                const d = new Date(prev);
                                d.setMonth(d.getMonth() + 1);
                                return d;
                              })}
                              className="p-1 rounded-lg hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Monthly Calendar Grid with circles */}
                          <div className="flex flex-col gap-1 w-full select-none">
                            <div className="grid grid-cols-7 gap-y-1 gap-x-1 sm:gap-x-2 text-center text-[9px] font-black tracking-wider text-on-surface-variant/70">
                              <span>SUN</span>
                              <span>MON</span>
                              <span>TUE</span>
                              <span>WED</span>
                              <span>THU</span>
                              <span>FRI</span>
                              <span>SAT</span>
                            </div>

                            <div className="grid grid-cols-7 gap-y-2 gap-x-1 sm:gap-x-2 justify-items-center mt-1">
                              {monthlyCalendarCells.map((cell, idx) => {
                                if (cell === null) {
                                  return <div key={`empty-${idx}`} className="w-7 h-7 sm:w-8 sm:h-8" />;
                                }

                                let bgClass = '';
                                let textColorClass = '';

                                if (cell.isFuture) {
                                  bgClass = 'bg-[#e4e4e4]/20 dark:bg-zinc-800/10 border border-zinc-300/10 dark:border-zinc-700/10 opacity-30';
                                  textColorClass = 'text-on-surface-variant/45';
                                } else if (cell.count === 0) {
                                  bgClass = 'bg-[#e4e4e4] dark:bg-zinc-800/70 border border-zinc-300/20 dark:border-zinc-700/30';
                                  textColorClass = 'text-on-surface-variant/80';
                                } else {
                                  bgClass = 'bg-[#00E676] text-white shadow-sm';
                                  textColorClass = 'text-white font-black';
                                }

                                const outlineClass = cell.belongsToCurrentStreak && !cell.isFuture
                                  ? 'outline outline-[2px] outline-orange-400 dark:outline-orange-500 shadow-[0_0_10px_rgba(251,146,60,0.6)] z-10'
                                  : '';

                                const todayClass = cell.isToday
                                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-surface-container-low dark:ring-offset-zinc-900 bg-opacity-95'
                                  : '';

                                return (
                                  <div 
                                    key={`day-${cell.dayNum}`}
                                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 shrink-0 relative ${bgClass} ${outlineClass} ${todayClass}`}
                                    title={`${cell.date.toDateString()}: ${cell.count} wins`}
                                  >
                                    <span className={textColorClass}>{cell.dayNum}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-on-surface-variant/70 font-medium pt-2 border-t border-surface-container/60">
                            <div className="flex items-center gap-1 select-none font-black uppercase tracking-wider text-[#00E676] bg-[#00E676]/10 px-2 py-0.5 rounded-full">
                              <span>{(habitStats[currentMasterHabit]?.count || 0)} {language === 'ID' ? 'WIN' : 'WINS'}</span>
                            </div>
                            <div className="flex items-center gap-1.5 select-none animate-pulse">
                              <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] outline outline-[1.5px] outline-orange-500 dark:outline-orange-400" />
                              <span className="text-on-surface font-black uppercase tracking-wider">{language === 'ID' ? 'Hari Beruntun' : 'Current streak'}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              {/* AI Token Usage Log Bento Card */}
              <section className="bg-surface p-5 bento-card flex flex-col gap-4">
                <button 
                  onClick={() => setIsTokenLogsExpanded(!isTokenLogsExpanded)}
                  className="flex items-center justify-between w-full text-left cursor-pointer focus:outline-none"
                >
                  <div className="flex items-center gap-2">
                    <h2 className="label-caps">{language === 'ID' ? 'Pelacakan Token & Kuota AI' : 'AI Token & Quota Tracker'}</h2>
                    {tokenLogs.length > 0 && (
                      <span className="text-[9px] text-secondary font-bold bg-secondary/10 px-2.5 py-0.5 rounded-full tracking-wider uppercase">
                        {filteredTokenLogs.reduce((sum, l) => sum + (l.inputTokens + l.outputTokens), 0).toLocaleString()} Tokens
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`w-5 h-5 text-on-surface-variant transition-transform duration-300 ${isTokenLogsExpanded ? 'rotate-180' : ''}`} />
                </button>

                {/* Timeframe Filters Row */}
                {tokenLogs.length > 0 && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-1 p-3 bg-surface-container/30 rounded-2xl border border-surface-container/50">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(['All', 'Day', 'Week', 'Month', 'Year'] as const).map((filter) => {
                        const isActive = tokenTimeframeFilter === filter;
                        let label: string = filter;
                        if (language === 'ID') {
                          if (filter === 'All') label = 'Semua';
                          else if (filter === 'Day') label = 'Hari';
                          else if (filter === 'Week') label = 'Minggu';
                          else if (filter === 'Month') label = 'Bulan';
                          else if (filter === 'Year') label = 'Tahun';
                        } else {
                          if (filter === 'All') label = 'All';
                        }
                        return (
                          <button
                            key={filter}
                            onClick={() => setTokenTimeframeFilter(filter)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                              isActive
                                ? 'bg-[#FF9100]/20 text-[#FF9100] border border-[#FF9100]/30 shadow-sm font-black'
                                : 'bg-surface-container/60 hover:bg-surface-container hover:text-on-surface text-on-surface-variant/80 border border-transparent'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Day-specific sub-selection combo box */}
                    {tokenTimeframeFilter === 'Day' && (
                      <div className="relative min-w-[140px]">
                        <select
                          value={selectedTokenDayKey}
                          onChange={(e) => setSelectedTokenDayKey(e.target.value)}
                          className="w-full text-xs bg-surface-container border border-[#FF9100]/20 font-semibold px-3 pr-8 py-1.5 rounded-lg text-on-surface focus:outline-none focus:border-[#FF9100] cursor-pointer appearance-none outline-none font-mono"
                        >
                          {getPast6Days().map((dayOpt) => (
                            <option key={dayOpt.key} value={dayOpt.key} className="bg-surface font-semibold text-on-surface font-sans">
                              {language === 'ID' ? dayOpt.labelID : dayOpt.labelEN}
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-[#FF9100] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    )}
                  </div>
                )}

                {/* Always-visible Mini KPI Summary when Collapsed */}
                {!isTokenLogsExpanded && tokenLogs.length > 0 && (
                  <div className="grid grid-cols-2 gap-4 mt-1 p-3 bg-surface-container rounded-xl text-xs">
                    <div>
                      <p className="opacity-40">{language === 'ID' ? 'Total Masukan' : 'Total Input Prompt'}</p>
                      <p className="font-bold text-sm text-primary">
                        {filteredTokenLogs.reduce((sum, l) => sum + l.inputTokens, 0).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="opacity-40">{language === 'ID' ? 'Total Keluaran' : 'Total Output Candidates'}</p>
                      <p className="font-bold text-sm text-secondary">
                        {filteredTokenLogs.reduce((sum, l) => sum + l.outputTokens, 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}

                <AnimatePresence initial={false}>
                  {isTokenLogsExpanded && (
                    <motion.div
                      key="token-logs-content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden flex flex-col gap-4 mt-2"
                    >
                      {tokenLogs.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/40 italic py-2 text-center">
                          {language === 'ID' ? 'Belum ada penggunaan AI. Mulailah mengobrol atau menganalisis kemenangan!' : 'No AI usage recorded yet. Start chatting or analyzing wins!'}
                        </p>
                      ) : filteredTokenLogs.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/40 italic py-4 text-center">
                          {language === 'ID' ? 'Tidak ada penggunaan AI yang cocok dengan filter yang dipilih.' : 'No AI usage matches the selected filter.'}
                        </p>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <div className="overflow-x-auto w-full">
                            <table className="w-full text-[11px] text-left border-collapse">
                              <thead>
                                <tr className="border-b border-surface-container-high text-on-surface-variant bg-surface-container/50">
                                  <th className="py-2 px-3 font-semibold label-caps opacity-60">{language === 'ID' ? 'Tanggal' : 'Date'}</th>
                                  <th className="py-2 px-3 font-semibold label-caps opacity-60">{language === 'ID' ? 'Fitur / Fungsi' : 'Function'}</th>
                                  <th className="py-2 px-3 font-semibold label-caps opacity-60 text-right">{language === 'ID' ? 'Token Masuk' : 'Token Input'}</th>
                                  <th className="py-2 px-3 font-semibold label-caps opacity-60 text-right">{language === 'ID' ? 'Token Keluar' : 'Token Output'}</th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredTokenLogs.slice(0, 10).map((log) => {
                                  const dateObj = new Date(log.createdAt);
                                  const dateStr = dateObj.toLocaleDateString([], { month: 'short', day: '2-digit' }) + ' ' + dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                  return (
                                    <tr key={log.id} className="border-b border-surface-container/30 hover:bg-surface-container/20 transition-all font-mono">
                                      <td className="py-2 px-3 text-on-surface-variant font-sans whitespace-nowrap">{dateStr}</td>
                                      <td className="py-2 px-3 font-sans font-medium text-on-surface">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                          log.functionName === 'Chat Coach' 
                                            ? 'bg-blue-500/10 text-blue-500' 
                                            : log.functionName === 'Analyze Wins' 
                                              ? 'bg-rose-500/10 text-rose-500' 
                                              : 'bg-emerald-500/10 text-emerald-500'
                                        }`}>
                                          {log.functionName}
                                        </span>
                                      </td>
                                      <td className="py-2 px-3 text-right text-primary font-bold">{log.inputTokens.toLocaleString()}</td>
                                      <td className="py-2 px-3 text-right text-secondary font-bold">{log.outputTokens.toLocaleString()}</td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {filteredTokenLogs.length > 10 && (
                            <div className="text-[10px] text-on-surface-variant/40 italic text-center pt-2">
                              {language === 'ID' ? `Menampilkan 10 logs terakhir dari total ${filteredTokenLogs.length} logs.` : `Showing last 10 logs of total ${filteredTokenLogs.length} logs.`}
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </section>

              <div className="flex flex-col sm:flex-row gap-2 mt-4">
                <button 
                  onClick={() => setShowClearDataConfirmation(true)}
                  className="flex-1 flex items-center justify-center gap-2 p-4 label-caps border border-red-500/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-500/5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> {language === 'ID' ? 'Hapus Semua Data' : 'Clear All Data'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="flex-1 flex items-center justify-center gap-2 p-4 label-caps border border-error/20 text-error rounded-lg hover:bg-error/5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> {language === 'ID' ? 'Keluar' : 'Logout'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Floating Chat Input (only on Chat) */}
      {activeView === 'chat' && (
        <form 
          onSubmit={handleChatSubmit}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 w-full max-w-md z-50 px-margin-page pb-4 flex justify-center"
        >
          <div className="w-full bg-primary text-on-primary p-2 rounded-full flex items-center gap-3 shadow-2xl border border-primary/10">
            <button 
              type="button"
              onClick={() => setChatHistory([])}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-on-primary/10 transition-colors"
              title="Clear History"
            >
              <Trash2 className="w-4 h-4 opacity-70 text-on-primary" />
            </button>
            <input 
              className="bg-transparent border-none focus:ring-0 flex-1 text-on-primary font-sans placeholder:text-on-primary/40" 
              placeholder="Apa yang ingin Anda ketahui?" 
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isChatting}
            />
            <button 
              type="submit"
              disabled={!chatInput.trim() || isChatting}
              className="bg-secondary text-white dark:text-black w-10 h-10 flex items-center justify-center rounded-full hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              {isChatting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Award className="w-5 h-5" />}
            </button>
          </div>
        </form>
      )}

      {/* Bottom Navigation */}
      <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 w-[calc(100%-32px)] max-w-md bg-surface/90 backdrop-blur-xl flex items-center justify-between px-2 py-2 z-50 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-surface-container-high transition-colors">
        <NavButton active={activeView === 'home'} onClick={() => setActiveView('home')} icon={<Home className="w-6 h-6" />} />
        <NavButton active={activeView === 'stats'} onClick={() => setActiveView('stats')} icon={<BarChart2 className="w-6 h-6" />} />
        <NavButton 
          active={activeView === 'record'} 
          onClick={() => {
            setActiveView('record');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }} 
          icon={<Plus className="w-8 h-8" />} 
          isCenter 
        />
        <NavButton active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={<MessageSquare className="w-6 h-6" />} />
        <NavButton active={activeView === 'profile'} onClick={() => setActiveView('profile')} icon={<UserIcon className="w-6 h-6" />} />
      </nav>

      {/* Google Sheets Export Success Popup Modal */}
      <AnimatePresence>
        {exportSuccessOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExportSuccessOpen(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-surface dark:bg-zinc-950 border border-surface-container max-w-sm w-full rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center shadow-inner">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-on-surface">
                  {language === 'ID' ? 'Berhasil Diekspor!' : 'Export Successful!'}
                </h3>
                <p className="text-on-surface-variant text-sm px-1">
                  {language === 'ID' 
                    ? 'Data Streak Anda telah sukses diekspor ke file baru di Google Drive Anda.' 
                    : 'Your Streak data has been successfully exported to a new file in your Google Drive.'}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2">
                {spreadsheetLink && (
                  <a
                    href={spreadsheetLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center gap-2 w-full px-5 py-3 bg-gradient-to-r from-emerald-600 to-[#1B5E20] hover:from-emerald-700 hover:to-[#0C3E10] text-white rounded-2xl font-bold text-sm transition-all shadow-md active:scale-97 cursor-pointer"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/>
                    </svg>
                    <span>{language === 'ID' ? 'Buka Google Sheet' : 'Open Google Sheet'}</span>
                  </a>
                )}
                <button
                  onClick={() => setExportSuccessOpen(false)}
                  className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-semibold text-xs border border-surface-container-high transition-colors active:scale-97 cursor-pointer"
                >
                  {language === 'ID' ? 'Selesai' : 'Done'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Clear All Data Confirmation Modal */}
      <AnimatePresence>
        {showClearDataConfirmation && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowClearDataConfirmation(false)}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-surface dark:bg-zinc-950 border border-red-500/20 max-w-sm w-full rounded-[32px] p-6 shadow-2xl flex flex-col items-center text-center gap-5"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center shadow-inner">
                <AlertTriangle className="w-8 h-8" />
              </div>
              
              <div className="flex flex-col gap-1">
                <h3 className="text-xl font-bold text-on-surface">
                  {language === 'ID' ? 'Hapus Semua Data?' : 'Delete All Data?'}
                </h3>
                <p className="text-on-surface-variant text-sm px-1 leading-relaxed">
                  {language === 'ID' 
                    ? 'Tindakan ini akan menghapus secara permanen seluruh entri kemenangan, tag, pengaturan, dan log token Anda dari database. Tindakan ini tidak dapat dibatalkan!' 
                    : 'This action will permanently delete all your winning entries, tags, settings, and token logs from the database. This cannot be undone!'}
                </p>
              </div>

              <div className="flex flex-col w-full gap-2 mt-2">
                <button
                  onClick={handleClearAllData}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-bold text-xs transition-colors shadow-md active:scale-97 cursor-pointer"
                >
                  {language === 'ID' ? 'Ya, Hapus Semua Data Saya' : 'Yes, Delete All My Data'}
                </button>
                <button
                  onClick={() => setShowClearDataConfirmation(false)}
                  className="w-full py-2.5 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-semibold text-xs border border-surface-container-high transition-colors active:scale-97 cursor-pointer"
                >
                  {language === 'ID' ? 'Batal' : 'Cancel'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Change Password Modal */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              if (!isUpdatingPassword) {
                setShowChangePasswordModal(false);
                setNewPasswordInput('');
                setConfirmPasswordInput('');
                setPasswordError(null);
                setPasswordSuccess(null);
              }
            }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 cursor-default"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="bg-surface dark:bg-zinc-950 border border-surface-container max-w-sm w-full rounded-[32px] p-6 shadow-2xl flex flex-col gap-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 text-primary rounded-2xl flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                </div>
                <div className="flex flex-col">
                  <h3 className="text-base font-bold text-on-surface">
                    {language === 'ID' ? 'Ubah Password' : 'Change Password'}
                  </h3>
                  <p className="text-xs text-on-surface-variant">
                    {language === 'ID' ? 'Perbarui sandi keamanan akun Anda' : 'Update your account security password'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {language === 'ID' ? 'Password Baru' : 'New Password'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    disabled={isUpdatingPassword}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-surface-container text-on-surface border border-surface-container-high focus:outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                    {language === 'ID' ? 'Konfirmasi Password Baru' : 'Confirm New Password'}
                  </label>
                  <input
                    type="password"
                    placeholder="••••••••"
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    disabled={isUpdatingPassword}
                    required
                    className="w-full px-4 py-2.5 rounded-2xl bg-surface-container text-on-surface border border-surface-container-high focus:outline-none focus:border-primary text-sm transition-colors"
                  />
                </div>

                {passwordError && (
                  <p className="text-xs text-red-600 dark:text-red-400 leading-tight">
                    {passwordError}
                  </p>
                )}

                {passwordSuccess && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 leading-tight">
                    {passwordSuccess}
                  </p>
                )}

                <div className="flex gap-2 w-full mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChangePasswordModal(false);
                      setNewPasswordInput('');
                      setConfirmPasswordInput('');
                      setPasswordError(null);
                      setPasswordSuccess(null);
                    }}
                    disabled={isUpdatingPassword}
                    className="flex-1 py-3 bg-surface-container hover:bg-surface-container-high text-on-surface rounded-2xl font-semibold text-xs transition-colors active:scale-97 cursor-pointer disabled:opacity-50"
                  >
                    {language === 'ID' ? 'Batal' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdatingPassword || !newPasswordInput || !confirmPasswordInput}
                    className="flex-1 py-3 bg-primary text-on-primary hover:bg-primary/95 rounded-2xl font-bold text-xs transition-all shadow-md active:scale-97 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isUpdatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{isUpdatingPassword ? (language === 'ID' ? 'Menyimpan...' : 'Saving...') : (language === 'ID' ? 'Simpan' : 'Save')}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Full-screen Photo Lightbox Preview */}
      <AnimatePresence>
        {previewImageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImageUrl(null)}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
          >
            <button 
              onClick={(e) => { e.stopPropagation(); setPreviewImageUrl(null); }}
              className="absolute top-4 right-4 bg-white/10 hover:bg-white/20 text-white p-2.5 rounded-full backdrop-blur-md transition-all active:scale-95 shadow-md border border-white/10"
              title={language === 'ID' ? 'Tutup' : 'Close'}
            >
              <X className="w-6 h-6" />
            </button>
            <motion.img 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 220 }}
              src={previewImageUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] rounded-2xl object-contain shadow-2xl border border-white/15"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>


      </div>
    </div>
  );
}

function NavButton({ active, onClick, icon, isCenter }: { active: boolean, onClick: () => void, icon: React.ReactNode, isCenter?: boolean }) {
  return (
    <button 
      onClick={onClick} 
      className={`flex-1 flex flex-col items-center justify-center transition-all duration-300 ${active ? 'scale-110' : 'hover:scale-105'}`}
    >
      <div className={`flex items-center justify-center transition-all ${
        isCenter 
          ? 'bg-primary w-14 h-14 rounded-full shadow-lg text-on-primary' 
          : active 
            ? 'text-primary' 
            : 'text-on-surface-variant'
      }`}>
        {icon}
      </div>
    </button>
  );
}
