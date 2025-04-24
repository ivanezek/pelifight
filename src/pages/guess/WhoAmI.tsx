import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Movie {
  id: number;
  title: string;
  release_date: string;
  genres: { id: number; name: string }[];
  overview: string;
  production_countries: { name: string }[];
  runtime: number;
  vote_average: number;
  production_companies: { name: string }[];
  original_language: string;
  tagline: string;
}

export default function WhoAmI() {
  const [movie, setMovie] = useState<Movie | null>(null);
  const [director, setDirector] = useState<string>('');
  const [mainActor, setMainActor] = useState<string>('');
  const [attempt, setAttempt] = useState(0);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>('playing');
  const [hints, setHints] = useState<string[]>([]);
  const [movieList, setMovieList] = useState<string[]>([]);
  const MAX_ATTEMPTS = 5;

  // Secuencia de pistas
  function getHint(attempt: number): string {
    if (!movie) return '';
    switch (attempt) {
      case 0:
        return `Año de estreno: ${movie.release_date?.slice(0, 4)}`;
      case 1:
        return `Género principal: ${movie.genres?.[0]?.name || '?'}`;
      case 2:
        return `Director: ${director}`;
      case 3:
        return `Actor/Actriz principal: ${mainActor}`;
      case 4:
        return movie.tagline ? `Tagline: ${movie.tagline}` : `Sinopsis: ${movie.overview.split('. ')[0]}.`;
      default:
        return '';
    }
  }

  // Fetch random movie and details
  useEffect(() => {
    async function fetchMovie() {
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
      const { data: details } = await axios.get(`https://api.themoviedb.org/3/movie/${random.id}`, {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
          append_to_response: 'credits',
        }
      });
      setMovie(details);
      // Director
      const dir = details.credits.crew.find((p: any) => p.job === 'Director');
      setDirector(dir ? dir.name : '?');
      // Actor principal
      setMainActor(details.credits.cast?.[0]?.name || '?');
      setHints([getHint(0)]);
      setAttempt(0);
      setInput('');
      setStatus('playing');
    }
    fetchMovie();
  }, []);

  // Cargar lista de películas para autocomplete
  useEffect(() => {
    async function fetchMovieList() {
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
    }
    fetchMovieList();
  }, []);

  function normalizeTitle(str: string) {
    return str
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[-:.,!¡¿?']/g, '')
      .replace(/\b(el|la|los|las|the|de|del|un|una|y|en|a|al|por|con|para|es|le)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isStrictTitleMatch(input: string, target: string) {
    // Normaliza y exige coincidencia exacta, pero solo si la longitud es > 2
    const normInput = normalizeTitle(input);
    const normTarget = normalizeTitle(target);
    if (normInput.length < 3) return false; // No acepta respuestas de 1 o 2 letras
    return normInput === normTarget;
  }

  function handleGuess(e: React.FormEvent) {
    e.preventDefault();
    if (!movie || status !== 'playing') return;
    if (isStrictTitleMatch(input, movie.title)) {
      setStatus('won');
    } else if (attempt >= MAX_ATTEMPTS - 1) {
      setStatus('lost');
    } else {
      setAttempt(attempt + 1);
      setHints(hs => [...hs, getHint(attempt + 1)]);
    }
    setInput('');
  }

  function handlePlayAgain() {
    window.location.reload();
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-8">
      <Card className="w-full max-w-md p-8 rounded-2xl shadow-xl bg-white/95 dark:bg-black/90 flex flex-col items-center">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-green-200">¿Quién soy?</h1>
        <div className="mb-6 w-full">
          <div className="mb-2 text-lg font-semibold text-gray-700 dark:text-gray-300">Pistas:</div>
          <ul className="list-disc pl-6 text-gray-800 dark:text-gray-200 text-base">
            {hints.map((hint, i) => <li key={i}>{hint}</li>)}
          </ul>
        </div>
        {status === 'playing' && (
          <form className="flex flex-col items-center gap-4 w-full" onSubmit={handleGuess} autoComplete="off">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400 text-black dark:text-black bg-white dark:bg-white"
              placeholder="Nombre de la película"
              autoFocus
              list="movie-autocomplete"
            />
            <datalist id="movie-autocomplete">
              {movieList.map((title, i) => (
                <option key={i} value={title} />
              ))}
            </datalist>
            <Button type="submit" className="w-full" disabled={!input.trim()}>Adivinar</Button>
            <div className="text-sm text-gray-500">Intentos restantes: {MAX_ATTEMPTS - attempt}</div>
          </form>
        )}
        {status !== 'playing' && (
          <div className="mt-6 w-full flex flex-col items-center">
            <div className={`mb-2 text-lg font-semibold ${status === 'won' ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
              {status === 'won' ? '¡Correcto!' : `Perdiste. Era: ${movie?.title}`}
            </div>
            <Button className="mt-2 w-full" onClick={handlePlayAgain}>Jugar de nuevo</Button>
          </div>
        )}
      </Card>
    </div>
  );
}
