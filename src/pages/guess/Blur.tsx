import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/Avatar';
import axios from 'axios';

interface Movie {
  id: number;
  title: string;
  poster_path: string;
}

interface PlayerRecord {
  id?: string;
  username?: string;
  avatar_url?: string | null;
  score: number;
  date: string;
}

// Niveles de blur mejorados: anteúltimo intento deja un poco de blur
const BLUR_LEVELS = [24, 18, 12, 7, 3, 0];

const MAX_ATTEMPTS = 5;
const MOVIES_PER_ROUND = 5;
const TIMER_SECONDS = 20;

// --- Utilidad para normalizar títulos (quita tildes, guiones, signos, minúsculas, y palabras comunes) ---
function normalizeTitle(str: string) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[-:.,!¡¿?']/g, '') // quita signos
    .replace(/\b(el|la|los|las|the|de|del|un|una|y|en|a|al|por|con|para|es|le)\b/g, '') // quita palabras comunes
    .replace(/\s+/g, ' ') // espacios extra
    .trim();
}

// --- Coincidencia tolerante: acepta si el input contiene el título o viceversa, o si la distancia de Levenshtein es baja ---
function isTolerantMatch(a: string, b: string) {
  const normA = normalizeTitle(a);
  const normB = normalizeTitle(b);
  if (normA === normB) return true;
  if (normA.includes(normB) || normB.includes(normA)) return true;
  // Levenshtein distance <= 2 para tolerar errores menores
  function levenshtein(s: string, t: string) {
    const d = Array.from({ length: s.length + 1 }, (_, i) => [i, ...Array(t.length).fill(0)]);
    for (let j = 1; j <= t.length; j++) d[0][j] = j;
    for (let i = 1; i <= s.length; i++) {
      for (let j = 1; j <= t.length; j++) {
        d[i][j] = Math.min(
          d[i-1][j] + 1,
          d[i][j-1] + 1,
          d[i-1][j-1] + (s[i-1] === t[j-1] ? 0 : 1)
        );
      }
    }
    return d[s.length][t.length];
  }
  return levenshtein(normA, normB) <= 2;
}

const GuessBlur = () => {
  // --- Cambia a múltiples películas por ronda ---
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [input, setInput] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost' | 'finished'>('playing');
  const [score, setScore] = useState(0); // score de la ronda actual
  const [topRecords, setTopRecords] = useState<PlayerRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{username: string, avatar_url: string | null} | null>(null);
  const [loading, setLoading] = useState(false);
  const [movieList, setMovieList] = useState<string[]>([]);
  const [hints, setHints] = useState<string[]>([]);
  const [extraMovieData, setExtraMovieData] = useState<any>(null);
  const [perMovieScores, setPerMovieScores] = useState<number[]>([]); // para sumar el score de cada película
  const [successFeedback, setSuccessFeedback] = useState<{idx: number, points: number}[]>([]); // feedback visual de aciertos
  const [timer, setTimer] = useState(TIMER_SECONDS);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      if (data.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', data.user.id)
          .single();
        setProfile(profileData || null);
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadTopRecords();
    fetchMovieList();
  }, []);

  const fetchMovieList = async () => {
    // Trae las películas populares de las primeras 5 páginas
    let allTitles: string[] = [];
    for (let page = 1; page <= 5; page++) {
      const { data } = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
          sort_by: 'popularity.desc',
          page,
          'vote_count.gte': 1000,
        }
      });
      if (data.results) {
        allTitles = allTitles.concat(data.results.map((m: any) => m.title));
      }
    }
    setMovieList(Array.from(new Set(allTitles)));
  };

  const loadTopRecords = async () => {
    const { data } = await supabase
      .from('guess_blur_scores')
      .select('score, played_at, user_id, profiles(username, avatar_url)')
      .order('score', { ascending: false })
      .order('played_at', { ascending: false });
    if (data) {
      const uniqueRecords = [];
      const seen = new Set();
      for (const row of data) {
        if (!seen.has(row.user_id)) {
          uniqueRecords.push(row);
          seen.add(row.user_id);
        }
        if (uniqueRecords.length >= 10) break;
      }
      setTopRecords(
        uniqueRecords.map((row: any) => ({
          id: row.user_id + '_' + row.played_at,
          username: row.profiles && typeof row.profiles === 'object' ? row.profiles.username || 'Anon' : 'Anon',
          avatar_url: row.profiles && typeof row.profiles === 'object' ? row.profiles.avatar_url : null,
          score: row.score,
          date: row.played_at,
        }))
      );
    } else {
      setTopRecords([]);
    }
  };

  // Reinicia timer cada vez que cambia de película o ronda
  useEffect(() => {
    if (status === 'playing' && movies.length > 0) {
      setTimer(TIMER_SECONDS);
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleTimeout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, movies, status]);

  // Limpia timer al desmontar
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // Cuando el usuario acierta o termina la ronda, limpia el timer
  useEffect(() => {
    if (status === 'finished') { if (timerRef.current) clearInterval(timerRef.current); }
  }, [status]);

  // Handler cuando se acaba el tiempo
  const handleTimeout = () => {
    setHints([]);
    setPerMovieScores(scores => {
      const newScores = [...scores, 0];
      if (currentIdx === MOVIES_PER_ROUND - 1) {
        setStatus('finished');
        setScore(newScores.reduce((a, b) => a + b, 0));
        saveScore(newScores.reduce((a, b) => a + b, 0));
      } else {
        setCurrentIdx(idx => idx + 1);
      }
      return newScores;
    });
    setSuccessFeedback(fb => [...fb, { idx: currentIdx, points: 0 }]);
    setInput('');
  };

  // --- Al iniciar, trae 5 películas distintas ---
  const fetchMoviesForRound = async () => {
    setLoading(true);
    setInput('');
    setAttempt(0);
    setStatus('playing');
    setScore(0);
    setHints([]);
    setExtraMovieData(null);
    setCurrentIdx(0);
    setPerMovieScores([]);
    setSuccessFeedback([]);
    // Trae varias páginas y elige 5 películas aleatorias y únicas
    let allMovies: Movie[] = [];
    for (let page = 1; page <= 5; page++) {
      const { data } = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
          sort_by: 'popularity.desc',
          page,
          'vote_count.gte': 1000,
        }
      });
      if (data.results) {
        allMovies = allMovies.concat(data.results.map((m: any) => ({ id: m.id, title: m.title, poster_path: m.poster_path })));
      }
    }
    // Elige 5 películas únicas
    const chosen: Movie[] = [];
    const usedIds = new Set();
    while (chosen.length < MOVIES_PER_ROUND && allMovies.length) {
      const idx = Math.floor(Math.random() * allMovies.length);
      const movie = allMovies[idx];
      if (!usedIds.has(movie.id) && movie.poster_path) {
        chosen.push(movie);
        usedIds.add(movie.id);
      }
      allMovies.splice(idx, 1);
    }
    setMovies(chosen);
    setLoading(false);
  };

  // --- Al cambiar de película, trae detalles para pistas ---
  useEffect(() => {
    if (movies.length && movies[currentIdx]) {
      fetchMovieDetails(movies[currentIdx].id);
      setHints([]);
      setAttempt(0);
    }
  }, [currentIdx, movies]);

  // --- Inicializa la ronda al montar ---
  useEffect(() => {
    fetchMoviesForRound();
  }, []);

  // --- Lógica de intento ---
  const handleGuess = async () => {
    if (!movies.length || status !== 'playing' || !extraMovieData) return;
    const currentMovie = movies[currentIdx];
    const correct = isTolerantMatch(input, currentMovie.title);
    if (correct) {
      const points = MAX_ATTEMPTS - attempt;
      setHints([]);
      setSuccessFeedback(fb => [...fb, { idx: currentIdx, points }]);
      setPerMovieScores(scores => {
        const newScores = [...scores, points];
        // Si es la última película, termina la ronda
        if (currentIdx === MOVIES_PER_ROUND - 1) {
          setStatus('finished');
          setScore(newScores.reduce((a, b) => a + b, 0));
          saveScore(newScores.reduce((a, b) => a + b, 0));
        } else {
          setCurrentIdx(idx => idx + 1);
        }
        return newScores;
      });
    } else {
      // --- Pistas ---
      let newHint = '';
      if (attempt === 0) newHint = `Año de estreno: ${extraMovieData.year}`;
      else if (attempt === 1) newHint = `Género: ${extraMovieData.genres}`;
      else if (attempt === 2) newHint = `Puntuación TMDB: ${extraMovieData.rating}`;
      else if (attempt >= 3 && attempt <= 5 && extraMovieData.actors && extraMovieData.actors.length > (attempt-3))
        newHint = `Actor/actriz: ${extraMovieData.actors[attempt-3]}`;
      setHints(hints => [...hints, newHint]);
      if (attempt >= MAX_ATTEMPTS - 1) {
        setPerMovieScores(scores => {
          const newScores = [...scores, 0];
          if (currentIdx === MOVIES_PER_ROUND - 1) {
            setStatus('finished');
            setScore(newScores.reduce((a, b) => a + b, 0));
            saveScore(newScores.reduce((a, b) => a + b, 0));
          } else {
            setCurrentIdx(idx => idx + 1);
          }
          return newScores;
        });
      } else {
        setAttempt(attempt + 1);
      }
    }
    setInput('');
  };

  // --- Reiniciar ronda ---
  const handlePlayAgain = () => {
    fetchMoviesForRound();
    setPerMovieScores([]);
    setScore(0);
    setStatus('playing');
    setCurrentIdx(0);
  };

  // --- Blur y autocomplete igual que antes ---
  const blurValue = status === 'playing' ? BLUR_LEVELS[attempt] : 0;
  const filteredSuggestions = input.length > 0
    ? movieList.filter(title =>
        normalizeTitle(title).includes(normalizeTitle(input))
      ).slice(0, 8)
    : [];

  // --- Obtiene info extra de la película (año, géneros, puntuación, actores) ---
  const fetchMovieDetails = async (movieId: number) => {
    const [{ data: movie }, { data: credits }] = await Promise.all([
      axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
        }
      }),
      axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
        }
      })
    ]);
    setExtraMovieData({
      year: movie.release_date ? new Date(movie.release_date).getFullYear() : undefined,
      genres: movie.genres ? movie.genres.map((g: any) => g.name).join(', ') : '',
      rating: movie.vote_average,
      actors: credits.cast ? credits.cast.slice(0, 5).map((a: any) => a.name) : [],
    });
  };

  // --- Guarda el puntaje ---
  const saveScore = async (scoreToSave: number) => {
    if (!user) return;
    const { data: current } = await supabase
      .from('guess_blur_scores')
      .select('score')
      .eq('user_id', user.id)
      .single();
    if (!current || scoreToSave > current.score) {
      await supabase
        .from('guess_blur_scores')
        .upsert({
          user_id: user.id,
          score: scoreToSave,
          played_at: new Date().toISOString(),
        });
    }
  };

  // --- Render ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 py-8">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90 flex flex-col items-center">
        {/* Header: usuario y puntaje */}
        <div className="w-full flex flex-row items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Avatar src={profile?.avatar_url || undefined} fallback={profile?.username?.[0] || '?'} className="h-8 w-8" />
            <span className="font-semibold text-gray-800 dark:text-gray-100">{profile?.username || 'Invitado'}</span>
          </div>
          <div className="flex flex-row gap-4 items-center">
            <span className="font-bold text-green-700 dark:text-green-300">Puntaje: {perMovieScores.reduce((a,b)=>a+b,0)}</span>
            <span className={`font-mono px-2 py-1 rounded-lg text-white ${timer > 5 ? 'bg-green-500' : 'bg-red-600 animate-pulse'}`}>{timer}s</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-green-200">Adivina la película blureada</h1>
        {/* Indicador de progreso/aciertos */}
        <div className="flex flex-row gap-2 mb-4">
          {Array.from({length: MOVIES_PER_ROUND}).map((_, i) => (
            <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${successFeedback[i] ? 'bg-green-400 border-green-700 text-white' : (successFeedback[i] === undefined && i < perMovieScores.length && perMovieScores[i] === 0) ? 'bg-gray-400 border-gray-600 text-white' : 'bg-gray-200 dark:bg-gray-700 border-gray-400 dark:border-gray-500'} px-2 py-1 text-base font-bold`}>
              {successFeedback[i] ? `+${successFeedback[i].points}` : (successFeedback[i] === undefined && i < perMovieScores.length && perMovieScores[i] === 0) ? '0' : ''}
            </div>
          ))}
        </div>
        {movies.length > 0 && status !== 'finished' && (
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-2 text-gray-700 dark:text-gray-300 font-medium">Película {currentIdx + 1} de {MOVIES_PER_ROUND}</div>
            <img
              src={`https://image.tmdb.org/t/p/w500${movies[currentIdx].poster_path}`}
              alt="Poster blureado"
              style={{ filter: `blur(${blurValue}px)`, transition: 'filter 0.4s' }}
              className="w-64 h-96 object-cover rounded-xl border-4 border-gray-200 dark:border-gray-700"
            />
            {/* Pistas */}
            {hints.length > 0 && (
              <div className="mt-4 w-full flex flex-col gap-1">
                {hints.map((hint, idx) => (
                  <div key={idx} className="text-sm text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-md">{hint}</div>
                ))}
              </div>
            )}
          </div>
        )}
        {status === 'finished' && (
          <div className="mb-6 flex flex-col items-center">
            <div className="mb-4 text-2xl font-bold text-green-700 dark:text-green-300">¡Ronda completada!</div>
            <div className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Tu puntaje: <span className="text-green-600 dark:text-green-200">{score} puntos</span></div>
            <Button className="mt-4 w-full" onClick={handlePlayAgain}>Jugar otra ronda</Button>
          </div>
        )}
        {movies.length > 0 && status !== 'finished' && (
          <form
            className="flex flex-col items-center gap-4 w-full relative"
            autoComplete="off"
            onSubmit={e => { e.preventDefault(); handleGuess(); }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-black dark:text-black bg-white dark:bg-white"
              placeholder="Nombre de la película"
              autoFocus
              autoComplete="off"
              list="movie-suggestions"
            />
            <datalist id="movie-suggestions">
              {filteredSuggestions.map((title, idx) => (
                <option value={title} key={idx} />
              ))}
            </datalist>
            <Button type="submit" className="w-full" disabled={loading || !input.trim()}>Adivinar</Button>
            <div className="text-sm text-gray-500">Intentos restantes: {MAX_ATTEMPTS - attempt}</div>
          </form>
        )}
      </Card>
      <div className="w-full max-w-md mt-8">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-green-200">Top 10 Ranking</h2>
        <div className="space-y-2">
          {topRecords.map((r, idx) => (
            <div key={r.id} className="flex items-center justify-between px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              <div className="flex items-center gap-3">
                <span className="font-bold text-lg text-gray-600 dark:text-gray-400">{idx + 1}.</span>
                <Avatar src={r.avatar_url || undefined} fallback={r.username?.[0] || '?'} className="h-8 w-8" />
                <span className="font-semibold text-gray-800 dark:text-gray-100">{r.username}</span>
              </div>
              <span className="font-bold text-green-600 dark:text-green-400 text-lg">{r.score} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default GuessBlur;
