import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { supabase } from '../lib/supabaseClient';
import { Avatar } from "@/components/Avatar";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  actors?: string[];
}

interface PlayerRecord {
  id?: string;
  username?: string;
  avatar_url?: string | null;
  name?: string; // para compatibilidad con records antiguos
  score: number;
  date: string;
}

interface GameRound {
  movies: [Movie, Movie];
  guess: number | null;
  isCorrect: boolean | null;
}

const GAME_MODES = [
  { key: 'score', label: '¿Cuál tiene mejor puntaje?' },
  { key: 'release', label: '¿Cuál se estrenó primero?' }
] as const;
type GameMode = typeof GAME_MODES[number]['key'];

const GuessGame = () => {
  const [allRounds, setAllRounds] = useState<GameRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [topRecords, setTopRecords] = useState<PlayerRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<{username: string, avatar_url: string | null} | null>(null);
  const [showStart, setShowStart] = useState(true);
  const [mode, setMode] = useState<GameMode | null>(null);

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
  }, []);

  const loadTopRecords = async () => {
    const { data } = await supabase
      .from('best_guess_scores')
      .select('score, played_at, profiles(username, avatar_url)')
      .order('score', { ascending: false })
      .limit(10);
    setTopRecords(
      data?.map((row: any) => ({
        id: row.id,
        username: row.profiles?.username,
        avatar_url: row.profiles?.avatar_url,
        name: row.profiles?.username || 'Anon',
        score: row.score,
        date: row.played_at,
      })) || []
    );
  };

  const handleStartGame = () => {
    fetchAllPairs();
    setShowStart(false);
  };

  const fetchAllPairs = async () => {
    setLoading(true);
    try {
      const initialResponse = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
          sort_by: 'vote_count.desc',
          'vote_count.gte': 3000,
          'vote_average.gte': 6,
        }
      });

      const totalPages = Math.min(initialResponse.data.total_pages, 20);
      const randomPages = new Set<number>();
      while (randomPages.size < 4) {
        randomPages.add(Math.floor(Math.random() * totalPages) + 1);
      }

      const moviePromises = Array.from(randomPages).map(page =>
        axios.get('https://api.themoviedb.org/3/discover/movie', {
          params: {
            api_key: import.meta.env.VITE_TMDB_API_KEY,
            language: 'es-ES',
            sort_by: 'vote_count.desc',
            'vote_count.gte': 3000,
            'vote_average.gte': 6,
            page
          }
        })
      );

      const movieResponses = await Promise.all(moviePromises);
      const allMovies = movieResponses
        .flatMap(response => response.data.results)
        .filter((movie: Movie) => movie.poster_path && movie.vote_average > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      const creditsPromises = allMovies.map(async (movie: Movie) => {
        try {
          const creditsRes = await axios.get(`https://api.themoviedb.org/3/movie/${movie.id}/credits`, {
            params: { api_key: import.meta.env.VITE_TMDB_API_KEY, language: 'es-ES' }
          });
          const actors = creditsRes.data.cast?.slice(0, 3).map((actor: any) => actor.name) || [];
          return { ...movie, actors };
        } catch {
          return { ...movie, actors: [] };
        }
      });
      const moviesWithActors = await Promise.all(creditsPromises);

      const rounds: GameRound[] = [];
      for (let i = 0; i < 10; i++) {
        rounds.push({
          movies: [moviesWithActors[i * 2], moviesWithActors[i * 2 + 1]],
          guess: null,
          isCorrect: null
        });
      }

      setAllRounds(rounds);
      setCurrentRound(0);
      setScore(0);
      setGameEnded(false);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching movies:', error);
      setLoading(false);
    }
  };

  const handleGuess = (index: number) => {
    if (showResult || !allRounds[currentRound]) return;
    const selectedMovie = allRounds[currentRound].movies[index];
    const otherMovie = allRounds[currentRound].movies[1 - index];

    if (!selectedMovie || !otherMovie) return;

    let isCorrectGuess = false;
    if (mode === 'score') {
      const selectedScore = Math.round(selectedMovie.vote_average * 10) / 10;
      const otherScore = Math.round(otherMovie.vote_average * 10) / 10;
      isCorrectGuess = selectedScore >= otherScore;
    } else if (mode === 'release') {
      // Comparar por fecha completa (año, mes y día), no solo el año
      const selectedDate = new Date(selectedMovie.release_date).getTime();
      const otherDate = new Date(otherMovie.release_date).getTime();
      isCorrectGuess = selectedDate <= otherDate;
    }

    setAllRounds((prev) => prev.map((r, i) =>
      i === currentRound ? { ...r, guess: index, isCorrect: isCorrectGuess } : r
    ));
    if (isCorrectGuess) setScore((prev) => prev + 1);
    setShowResult(true);
    setTimeout(() => {
      setShowResult(false);
      if (currentRound < allRounds.length - 1) {
        setCurrentRound((prev) => prev + 1);
      } else {
        setGameEnded(true);
        // Save score and reload leaderboard
        saveScore();
      }
    }, 1200);
  };

  const handlePlayAgain = () => {
    fetchAllPairs();
  };

  // Save score to Supabase after game ends
  const saveScore = async () => {
    if (!user) return;
    await supabase.from('best_guess_scores').insert({
      user_id: user.id,
      score,
      played_at: new Date().toISOString(),
    });
    await loadTopRecords();
  };

  if (!mode) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-green-200 transition-colors">Elige una modalidad de juego</h1>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          {GAME_MODES.map((m) => (
            <button
              key={m.key}
              className="py-3 px-4 rounded-lg font-semibold shadow-md hover:scale-105 transition-transform
                bg-gradient-to-r dark:from-green-800 dark:to-green-500 dark:text-white
                from-yellow-400 to-yellow-200 text-gray-900"
              onClick={() => setMode(m.key as GameMode)}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (showStart) {
    const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url || undefined;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Avatar src={avatarUrl} fallback={profile?.username?.[0] || '?'} className="h-16 w-16" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.username}</span>
          </div>
          <div className="mb-6 text-center text-gray-800 dark:text-gray-200">
            10 rondas – ¡Consigue la mayor puntuación!
          </div>
          <Button
            size="lg"
            className="w-full font-semibold rounded-xl shadow-md transition text-lg
              bg-gradient-to-r dark:from-green-800 dark:to-green-500 dark:text-white
              from-yellow-400 to-yellow-200 text-gray-900"
            onClick={handleStartGame}
          >
            Comenzar
          </Button>
        </Card>
      </div>
    );
  }

  if (loading || !allRounds.length) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-xl text-white">Cargando películas...</p>
      </div>
    );
  }

  if (gameEnded) {
    const avatarUrl = user?.user_metadata?.avatar_url || profile?.avatar_url || undefined;
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90">
          <div className="flex flex-col items-center gap-4 mb-6">
            <Avatar src={avatarUrl} fallback={profile?.username?.[0] || '?'} className="h-16 w-16" />
            <span className="text-lg font-semibold text-gray-900 dark:text-white">{profile?.username}</span>
          </div>
          <div className="mb-6 text-center text-gray-800 dark:text-gray-200">
            ¡Juego terminado! Tu puntuación: <span className="font-bold">{score}</span>
          </div>
          <div className="mb-8 w-full">
            <h2 className="text-lg font-bold mb-2 text-gray-800 dark:text-gray-200 text-left">Ranking Global</h2>
            <ol className="space-y-2">
              {topRecords.map((record, idx) => (
                <li key={record.id} className="flex items-center gap-3 bg-gray-100 rounded-xl px-3 py-2">
                  <span className="text-gray-400 font-bold">{idx + 1}.</span>
                  {record.avatar_url ? (
                    <img src={record.avatar_url} alt="avatar" className="w-7 h-7 rounded-full border border-purple-300" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 15c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    </div>
                  )}
                  <span className="font-medium text-gray-700 dark:text-gray-200">{record.username}</span>
                  <span className="ml-auto font-mono text-purple-700 font-bold">{record.score} pts</span>
                </li>
              ))}
              {topRecords.length === 0 && (
                <li className="text-gray-400 text-center">Sin récords aún</li>
              )}
            </ol>
          </div>

          <div className="w-full mb-8">
            <h3 className="text-base font-semibold text-gray-700 dark:text-gray-200 mb-3 text-left">Resumen de rondas</h3>
            <div className="grid grid-cols-2 gap-3">
              {allRounds.map((round, index) => (
                <div 
                  key={index}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 text-base font-semibold ${
                    round.isCorrect
                      ? 'bg-green-50 border-green-200 text-green-700 dark:text-green-200'
                      : 'bg-red-50 border-red-200 text-red-600 dark:text-red-400'
                  }`}
                >
                  <span className="mb-1">Ronda {index + 1}</span>
                  {round.isCorrect ? (
                    <span className="flex items-center gap-1"><svg className="w-5 h-5 text-green-500 dark:text-green-200" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>Correcto</span>
                  ) : (
                    <span className="flex items-center gap-1"><svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>Incorrecto</span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <Button
            size="lg"
            className="w-full font-semibold rounded-xl shadow-md transition text-lg
              bg-gradient-to-r dark:from-green-800 dark:to-green-500 dark:text-white
              from-yellow-400 to-yellow-200 text-gray-900"
            onClick={handlePlayAgain}
          >
            Jugar de nuevo
          </Button>
        </Card>
      </div>
    );
  }

  const currentMovies = allRounds[currentRound].movies;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <header className="text-center mb-8 w-full max-w-4xl">
        <h1 className="text-3xl md:text-4xl font-extrabold mb-2 drop-shadow text-gray-900 dark:text-green-200 transition-colors">
          {mode === 'score' ? '¿Cuál tiene mejor puntaje?' : '¿Cuál se estrenó primero?'}
        </h1>
        <div className="flex flex-wrap justify-center gap-4 text-lg md:text-xl">
          <span className="px-4 py-2 rounded-full bg-white/20 dark:bg-black/30 font-semibold text-gray-700 dark:text-gray-200">
            Jugador: {profile?.username}
          </span>
          <span className="px-4 py-2 rounded-full bg-white/20 dark:bg-black/30 font-semibold text-gray-700 dark:text-gray-200">
            Ronda: {currentRound + 1}/10
          </span>
          <span className="px-4 py-2 rounded-full bg-white/20 dark:bg-black/30 font-semibold text-gray-700 dark:text-gray-200">
            Puntuación: {score}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full mb-36">
        {currentMovies.map((movie, index) => (
          <motion.div
            key={movie.id}
            className="flex flex-col items-center"
            initial={{ scale: 1 }}
            animate={{
              scale: showResult && allRounds[currentRound].guess === index ? 1.05 : 1,
              boxShadow: showResult && allRounds[currentRound].guess === index
                ? allRounds[currentRound].isCorrect
                  ? '0 0 0 4px #86efac'
                  : '0 0 0 4px #fca5a5'
                : '0 0 0 0px transparent',
            }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className={`w-full max-w-sm hover:shadow-2xl transition-shadow cursor-pointer relative overflow-hidden border-2 ${
                showResult && allRounds[currentRound].guess === index
                  ? allRounds[currentRound].isCorrect
                    ? 'border-green-400'
                    : 'border-red-400'
                  : 'border-transparent'
              }`}
              onClick={() => handleGuess(index)}
            >
              <CardContent className="p-0">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover rounded-t-xl"
                />
                <div className="p-4 bg-black/80 dark:bg-white/80 flex flex-col justify-between min-h-[92px] h-[92px]">
                  <h3 className="font-semibold mb-1 text-lg text-white dark:text-gray-900 leading-tight line-clamp-2">{movie.title}</h3>
                  {movie.actors && movie.actors.length > 0 && (
                    <div className="text-xs text-gray-300 dark:text-gray-600 mb-1 truncate">
                      {movie.actors.slice(0, 3).join(', ')}
                    </div>
                  )}
                  <div className="flex justify-between text-sm text-gray-300 dark:text-gray-600">
                    {mode === 'score' && (
                      <span>{new Date(movie.release_date).getFullYear()}</span>
                    )}
                    {mode === 'release' && showResult && (
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4 text-blue-300 dark:text-blue-600 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M6 2a1 1 0 00-1 1v2a1 1 0 102 0V4h6v1a1 1 0 102 0V3a1 1 0 00-1-1H6zm3 7a1 1 0 00-.993.883L8 10v5a1 1 0 001.993.117L10 15v-5a1 1 0 00-1-1zm-7 7a2 2 0 002 2h10a2 2 0 002-2V7H2v9zm2-7h10v9a2 2 0 01-2 2H4a2 2 0 01-2-2V9z" /></svg>
                        {movie.release_date ? new Date(movie.release_date).toLocaleDateString('es-ES') : 'Sin fecha'}
                      </span>
                    )}
                    {mode === 'score' && showResult && (
                      <span className="flex items-center gap-1"><svg className="w-4 h-4 text-yellow-400 dark:text-yellow-600 inline" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.178c.969 0 1.371 1.24.588 1.81l-3.385 2.46a1 1 0 00-.364 1.118l1.287 3.966c.3.921-.755 1.688-1.54 1.118l-3.385-2.46a1 1 0 00-1.175 0l-3.385 2.46c-.784.57-1.838-.197-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.045 9.394c-.783-.57-.38-1.81.588-1.81h4.178a1 1 0 00.95-.69l1.286-3.967z" /></svg> {Math.round(movie.vote_average * 10) / 10}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {showResult && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-8 py-4 rounded-2xl text-white dark:text-gray-900 text-xl font-bold shadow-xl flex items-center gap-2 ${
              allRounds[currentRound].isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {allRounds[currentRound].isCorrect ? (
              <>
                <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                ¡Correcto! +1 punto
              </>
            ) : (
              <>
                <svg className="w-6 h-6 text-white dark:text-gray-900" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                ¡Incorrecto!
              </>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GuessGame; 