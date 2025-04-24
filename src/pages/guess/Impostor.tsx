import { useEffect, useState } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '../../lib/supabaseClient';

interface Actor {
  id: number;
  name: string;
  profile_path?: string;
}

interface Movie {
  id: number;
  title: string;
}

interface Round {
  actor: Actor;
  movies: Movie[];
  impostorIdx: number;
}

interface PlayerRecord {
  id?: string;
  username?: string;
  avatar_url?: string | null;
  score: number;
  date: string;
}

export default function Impostor() {
  const [rounds, setRounds] = useState<Round[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number|null>(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'playing'|'finished'>('playing');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [topRecords, setTopRecords] = useState<PlayerRecord[]>([]);
  const [popularActors, setPopularActors] = useState<Actor[]>([]);

  // --- Trae actores populares de TMDB ---
  useEffect(() => {
    async function fetchPopularActors() {
      const actors: Actor[] = [];
      for (let page = 1; page <= 2; page++) {
        const { data } = await axios.get('https://api.themoviedb.org/3/person/popular', {
          params: {
            api_key: import.meta.env.VITE_TMDB_API_KEY,
            language: 'es-ES',
            page
          }
        });
        if (data.results) {
          data.results.forEach((a: any) => {
            // Solo actores con nombre y al menos 5 películas
            if (a.known_for_department === 'Acting' && a.known_for?.length >= 5) {
              actors.push({ id: a.id, name: a.name, profile_path: a.profile_path });
            }
          });
        }
      }
      setPopularActors(actors);
    }
    fetchPopularActors();
  }, []);

  // --- Trae usuario actual y ranking ---
  useEffect(() => {
    async function fetchUser() {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
    }
    fetchUser();
    loadTopRecords();
  }, []);

  // --- Guarda el puntaje si es el mejor y refresca ranking ---
  async function saveScore(scoreToSave: number) {
    if (!user) return;
    const { data: current } = await supabase
      .from('guess_impostor_scores')
      .select('score')
      .eq('user_id', user.id)
      .single();
    if (!current || scoreToSave > current.score) {
      await supabase
        .from('guess_impostor_scores')
        .upsert({
          user_id: user.id,
          score: scoreToSave,
          played_at: new Date().toISOString(),
        });
    }
    loadTopRecords();
  }

  // --- Carga el ranking top 10 (mejor score por usuario) ---
  async function loadTopRecords() {
    const { data } = await supabase
      .from('guess_impostor_scores')
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
  }

  // Busca películas de un actor
  async function fetchActorMovies(actorId: number): Promise<Movie[]> {
    const { data } = await axios.get(`https://api.themoviedb.org/3/person/${actorId}/movie_credits`, {
      params: {
        api_key: import.meta.env.VITE_TMDB_API_KEY,
        language: 'es-ES',
      }
    });
    return data.cast?.map((m: any) => ({ id: m.id, title: m.title })) || [];
  }

  // Busca una película aleatoria donde NO actuó ese actor
  async function fetchImpostorMovie(excludeIds: number[]): Promise<Movie|null> {
    for (let i = 0; i < 10; i++) { // intenta hasta 10 veces
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
      const candidates = data.results.filter((m: any) => !excludeIds.includes(m.id));
      if (candidates.length > 0) {
        const m = candidates[Math.floor(Math.random() * candidates.length)];
        return { id: m.id, title: m.title };
      }
    }
    return null;
  }

  // Prepara las 10 rondas usando actores populares
  useEffect(() => {
    async function setup() {
      setLoading(true);
      if (popularActors.length === 0) return;
      const rounds: Round[] = [];
      // Mezcla y toma 10 actores populares
      const chosenActors = [...popularActors].sort(() => 0.5 - Math.random()).slice(0, 10);
      for (const actor of chosenActors) {
        const movies = await fetchActorMovies(actor.id);
        if (movies.length < 4) continue;
        // Elige 4 películas reales
        const realMovies = movies.sort(() => 0.5 - Math.random()).slice(0, 4);
        // Busca una impostora
        const impostor = await fetchImpostorMovie(realMovies.map(m => m.id));
        if (!impostor) continue;
        // Mezcla las 5 películas
        const allMovies = [...realMovies, impostor].sort(() => 0.5 - Math.random());
        const impostorIdx = allMovies.findIndex(m => m.id === impostor.id);
        rounds.push({ actor, movies: allMovies, impostorIdx });
        if (rounds.length === 10) break;
      }
      setRounds(rounds);
      setLoading(false);
    }
    setup();
  }, [popularActors]);

  function handleSelect(idx: number) {
    if (status !== 'playing' || selected !== null) return;
    setSelected(idx);
    if (idx === rounds[current].impostorIdx) {
      setScore(s => s + 1);
    }
    setTimeout(() => {
      if (current === 9) {
        setStatus('finished');
        saveScore(score + (idx === rounds[current].impostorIdx ? 1 : 0));
      } else {
        setCurrent(c => c + 1);
        setSelected(null);
      }
    }, 1200);
  }

  if (loading) return <div className="flex justify-center items-center min-h-[60vh]">Cargando...</div>;
  if (!rounds.length) return <div className="p-8">No se pudieron preparar rondas. Intenta recargar.</div>;

  const round = rounds[current];

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-xl p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-green-700 dark:text-green-200">El impostor</h1>
        <div className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Actor/Actriz: <b>{round.actor.name}</b></div>
        <div className="mb-6">¿En cuál de estas películas <b>NO</b> actuó?</div>
        <ul className="w-full flex flex-col gap-3 mb-6">
          {round.movies.map((movie, i) => (
            <li key={movie.id}>
              <Button
                className={
                  'w-full py-4 text-lg ' +
                  (selected !== null
                    ? i === round.impostorIdx
                      ? 'bg-red-400 dark:bg-red-600 text-white'
                      : i === selected
                        ? 'bg-gray-300 dark:bg-gray-700'
                        : ''
                    : '')
                }
                disabled={selected !== null}
                onClick={() => handleSelect(i)}
              >
                {movie.title}
              </Button>
            </li>
          ))}
        </ul>
        <div className="mb-2">Intento {current + 1} de 10</div>
        <div className="mb-2">Puntaje: <b>{score}</b></div>
        {status === 'finished' && (
          <div className="mt-4 text-xl font-bold text-green-600 dark:text-green-300">Juego terminado. ¡Tu puntaje es {score}!</div>
        )}
        <div className="mt-8 w-full">
          <h2 className="text-lg font-semibold mb-2">Ranking Top 10</h2>
          <ul className="w-full flex flex-col gap-1">
            {topRecords.map((r, i) => (
              <li key={r.id} className="flex gap-2 items-center">
                <span className="w-6 text-right">{i + 1}.</span>
                {r.avatar_url && <img src={r.avatar_url} alt="avatar" className="w-6 h-6 rounded-full" />}
                <span className="flex-1">{r.username}</span>
                <span className="font-bold">{r.score}</span>
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
