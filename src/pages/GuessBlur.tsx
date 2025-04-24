import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
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

const BLUR_LEVELS = [16, 8, 4, 0];

const GuessBlur = () => {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [input, setInput] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [score, setScore] = useState(0);
  const [topRecords, setTopRecords] = useState<PlayerRecord[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    loadTopRecords();
  }, []);

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

  const fetchRandomMovie = async () => {
    setLoading(true);
    setInput('');
    setAttempt(0);
    setStatus('playing');
    setScore(0);
    // Película popular aleatoria
    const page = Math.floor(Math.random() * 10) + 1;
    const { data } = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params: {
        api_key: import.meta.env.VITE_TMDB_API_KEY,
        language: 'es-ES',
        sort_by: 'popularity.desc',
        page,
        'vote_count.gte': 1000,
      }
    });
    const results = data.results;
    const random = results[Math.floor(Math.random() * results.length)];
    setMovie({ id: random.id, title: random.title, poster_path: random.poster_path });
    setLoading(false);
  };

  useEffect(() => {
    fetchRandomMovie();
  }, []);

  const handleGuess = async () => {
    if (!movie || status !== 'playing') return;
    const normalizedInput = input.trim().toLowerCase();
    const normalizedTitle = movie.title.trim().toLowerCase();
    if (normalizedInput === normalizedTitle) {
      const points = 3 - attempt;
      setStatus('won');
      setScore(points);
      await saveScore(points);
      loadTopRecords();
    } else {
      if (attempt >= 2) {
        setStatus('lost');
        setScore(0);
        await saveScore(0);
        loadTopRecords();
      } else {
        setAttempt(attempt + 1);
      }
    }
    setInput('');
  };

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

  const handlePlayAgain = () => {
    fetchRandomMovie();
    setInput('');
    setAttempt(0);
    setStatus('playing');
    setScore(0);
  };

  const blurValue = BLUR_LEVELS[attempt];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-8 py-8">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-green-200">Adivina la película blureada</h1>
        {movie && (
          <div className="mb-6 flex flex-col items-center">
            <img
              src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
              alt="Poster blureado"
              style={{ filter: `blur(${blurValue}px)`, transition: 'filter 0.4s' }}
              className="w-64 h-96 object-cover rounded-xl border-4 border-gray-200 dark:border-gray-700"
            />
            {status !== 'playing' && (
              <div className={`mt-4 text-lg font-semibold ${status === 'won' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                {status === 'won' ? `¡Correcto! +${score} puntos` : `Perdiste. Era: ${movie.title}`}
              </div>
            )}
          </div>
        )}
        {status === 'playing' && (
          <form
            className="flex flex-col items-center gap-4 w-full"
            onSubmit={e => { e.preventDefault(); handleGuess(); }}
          >
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400"
              placeholder="Nombre de la película"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || !input.trim()}>Adivinar</Button>
            <div className="text-sm text-gray-500">Intentos restantes: {3 - attempt}</div>
          </form>
        )}
        {status !== 'playing' && (
          <Button className="mt-6 w-full" onClick={handlePlayAgain}>Jugar de nuevo</Button>
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
