import React, { useState, useEffect } from 'react';
import {
  BookMarked,
  FileText,
  Trophy,
  Trash2,
  Play,
  Volume2,
  RefreshCw,
  CheckCircle2,
  Plus,
  Search,
  ArrowLeft,
  FolderKanban,
} from 'lucide-react';
import {
  SavedExercise,
  SavedVocabularyItem,
  UserCloudStore,
} from '../../types/index.js';
import {
  fetchServerCloudStore,
  loadLocalCloudStore,
  saveLocalCloudStore,
  saveVocabularyToCloud,
  deleteCloudStoreItem,
  syncAllWithGoogleWorkspace,
} from '../../services/storageService.js';
import { toPinyinDisplay } from '../../utils/pinyinUtils.js';
import { playMandarinTTS } from '../../utils/speechUtils.js';

interface NotebookDriveViewProps {
  onBackToMenu: () => void;
  speechRate: number;
  onPlayAudio?: (text: string) => void;
  onLoadExercise: (exercise: SavedExercise) => void;
}

export const NotebookDriveView: React.FC<NotebookDriveViewProps> = ({
  onBackToMenu,
  speechRate,
  onPlayAudio,
  onLoadExercise,
}) => {
  const [store, setStore] = useState<UserCloudStore>(() => loadLocalCloudStore());
  const [activeTab, setActiveTab] = useState<'exercises' | 'vocabulary' | 'results'>('exercises');
  const [exerciseFilter, setExerciseFilter] = useState<'all' | 'conversation' | 'shadowing' | 'reading'>('all');
  const [vocabSearch, setVocabSearch] = useState('');

  // New word form
  const [newHanzi, setNewHanzi] = useState('');
  const [newPinyin, setNewPinyin] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newExample, setNewExample] = useState('');

  // Sync state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const handlePlayText = (text: string) => {
    if (onPlayAudio) {
      onPlayAudio(text);
    } else {
      playMandarinTTS(text, speechRate);
    }
  };

  useEffect(() => {
    fetchServerCloudStore().then(({ store: merged }) => {
      setStore(merged);
    });
  }, []);

  const handleAddVocabulary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHanzi.trim() || !newMeaning.trim()) return;
    const autoPinyin = newPinyin.trim() || toPinyinDisplay(newHanzi.trim());
    await saveVocabularyToCloud({
      hanzi: newHanzi.trim(),
      pinyin: autoPinyin,
      meaning: newMeaning.trim(),
      exampleHanzi: newExample.trim() || undefined,
      sourceMode: 'Cuaderno Manual',
    });
    setStore(loadLocalCloudStore());
    setNewHanzi('');
    setNewPinyin('');
    setNewMeaning('');
    setNewExample('');
  };

  const handleDelete = async (category: 'exercises' | 'vocabulary' | 'results', id: string) => {
    const updated = await deleteCloudStoreItem(category, id);
    setStore({ ...updated });
  };

  const handleCloudSync = async () => {
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const res = await syncAllWithGoogleWorkspace();
      setStore(res.store);
      setSyncMessage('¡Cuaderno sincronizado correctamente!');
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err: any) {
      setSyncMessage('Cuaderno guardado localmente.');
      setTimeout(() => setSyncMessage(null), 3500);
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredExercises = store.exercises.filter((ex) =>
    exerciseFilter === 'all' ? true : ex.type === exerciseFilter
  );

  const filteredVocab = store.vocabulary.filter((v) => {
    if (!vocabSearch.trim()) return true;
    const q = vocabSearch.toLowerCase();
    return (
      v.hanzi.toLowerCase().includes(q) ||
      v.pinyin.toLowerCase().includes(q) ||
      v.meaning.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 animate-fadeIn">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5 pb-4 border-b border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onBackToMenu}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-rose-400" />
            <span>Menú</span>
          </button>
          <div>
            <h1 className="text-lg sm:text-2xl font-black text-white flex items-center gap-2">
              <BookMarked className="w-5 h-5 sm:w-6 sm:h-6 text-sky-400" />
              <span>Mi Cuaderno de Estudio</span>
            </h1>
            <p className="text-xs text-slate-400">
              Guarda y vuelve a practicar tus ejercicios, textos, vocabulario y evaluaciones sin consumir cuota de IA.
            </p>
          </div>
        </div>

        <button
          onClick={handleCloudSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold shadow-lg shadow-sky-950/50 cursor-pointer disabled:opacity-50 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
        </button>
      </div>

      {syncMessage && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-xs text-emerald-200 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Navigation Tabs (3 Clean Tabs: Exercises, Vocabulary, Results) */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <button
          onClick={() => setActiveTab('exercises')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'exercises'
              ? 'bg-sky-600/20 border-sky-500/50 text-sky-200 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <FolderKanban className="w-4 h-4 text-sky-400" />
          <span>Ejercicios ({store.exercises.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('vocabulary')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'vocabulary'
              ? 'bg-amber-600/20 border-amber-500/50 text-amber-200 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookMarked className="w-4 h-4 text-amber-400" />
          <span>Vocabulario ({store.vocabulary.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('results')}
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
            activeTab === 'results'
              ? 'bg-emerald-600/20 border-emerald-500/50 text-emerald-200 shadow-sm'
              : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200'
          }`}
        >
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span>Resultados ({store.results.length})</span>
        </button>
      </div>

      {/* TAB 1: SAVED EXERCISES */}
      {activeTab === 'exercises' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(['all', 'conversation', 'shadowing', 'reading'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setExerciseFilter(filter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    exerciseFilter === filter
                      ? 'bg-sky-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {filter === 'all'
                    ? 'Todos'
                    : filter === 'conversation'
                    ? 'Conversación'
                    : filter === 'shadowing'
                    ? 'Shadowing'
                    : 'Lectura'}
                </button>
              ))}
            </div>
          </div>

          {filteredExercises.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No hay ejercicios guardados aún</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Al terminar un ejercicio en Conversación, Shadowing o Lectura, pulsa en "Guardar Ejercicio" para practicarlo cuantas veces quieras sin gastar llamadas de IA.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredExercises.map((ex) => (
                <div
                  key={ex.id}
                  className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                            {ex.type}
                          </span>
                          {ex.level && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                              {ex.level}
                            </span>
                          )}
                        </div>
                        <h3 className="text-base font-bold text-white mt-1.5">{ex.title}</h3>
                        {ex.chineseTitle && (
                          <p className="text-xs font-chinese text-slate-400">{ex.chineseTitle}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleDelete('exercises', ex.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                        title="Eliminar de mi cuaderno"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-500 mt-2">
                      Guardado: {new Date(ex.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  <button
                    onClick={() => onLoadExercise(ex)}
                    className="w-full py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Practicar Ahora</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SAVED VOCABULARY */}
      {activeTab === 'vocabulary' && (
        <div className="space-y-4">
          {/* Add Word Form */}
          <form
            onSubmit={handleAddVocabulary}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-2"
          >
            <input
              type="text"
              value={newHanzi}
              onChange={(e) => setNewHanzi(e.target.value)}
              placeholder="Hanzi (ej: 你好)"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newPinyin}
              onChange={(e) => setNewPinyin(e.target.value)}
              placeholder="Pinyin (opcional, auto)"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-amber-300 font-mono focus:outline-none focus:border-amber-500"
            />
            <input
              type="text"
              value={newMeaning}
              onChange={(e) => setNewMeaning(e.target.value)}
              placeholder="Significado en español"
              className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Guardar Palabra</span>
            </button>
          </form>

          {/* Search */}
          <div className="relative w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={vocabSearch}
              onChange={(e) => setVocabSearch(e.target.value)}
              placeholder="Buscar por Hanzi, Pinyin o español..."
              className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>

          {filteredVocab.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <BookMarked className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">No hay palabras o frases guardadas</p>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Agrega palabras arriba o pulsa el icono de guardar junto a cualquier frase en Conversación, Lectura o Shadowing.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredVocab.map((item: SavedVocabularyItem) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-2"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-lg font-bold text-white">{item.hanzi}</div>
                        <div className="text-xs font-mono text-amber-400">{item.pinyin}</div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handlePlayText(item.hanzi)}
                          className="p-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-colors cursor-pointer"
                          title="Escuchar pronunciación"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete('vocabulary', item.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-300 mt-1.5">{item.meaning}</p>
                    {item.exampleHanzi && (
                      <p className="text-[11px] text-slate-400 mt-1 italic">Ej: {item.exampleHanzi}</p>
                    )}
                  </div>
                  {item.sourceMode && (
                    <div className="text-[10px] text-slate-500 pt-1.5 border-t border-slate-800/60">
                      Origen: {item.sourceMode}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: RESULTS & HISTORY */}
      {activeTab === 'results' && (
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-300">
            Historial de Evaluaciones y Prácticas ({store.results.length})
          </h3>

          {store.results.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
              <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-bold text-slate-300">Sin resultados registrados todavía</p>
              <p className="text-xs text-slate-400">
                Tus evaluaciones de Shadowing, Lectura, Conversación y Diagnóstico HSK se guardan aquí automáticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {store.results.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {r.mode}
                      </span>
                      <span className="text-sm font-bold text-white">{r.title}</span>
                      {r.hskLevel && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                          {r.hskLevel}
                        </span>
                      )}
                    </div>
                    {r.details && <p className="text-xs text-slate-400">{r.details}</p>}
                    <div className="text-[10px] text-slate-500">
                      {new Date(r.createdAt).toLocaleString()}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div
                      className={`px-3 py-1.5 rounded-xl font-black text-sm border ${
                        r.passed
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      {r.score}%
                    </div>
                    <button
                      onClick={() => handleDelete('results', r.id)}
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer"
                      title="Eliminar registro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
