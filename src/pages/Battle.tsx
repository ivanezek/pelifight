import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  genre_ids: number[];
}

interface TournamentConfig {
  genre: string;
  yearFrom: number;
  yearTo: number;
  language: string;
  totalMovies: number;
  sortBy: string;
}

const GENRES = [
  { id: "28", name: "Acción" },
  { id: "12", name: "Aventura" },
  { id: "16", name: "Animación" },
  { id: "35", name: "Comedia" },
  { id: "80", name: "Crimen" },
  { id: "18", name: "Drama" },
  { id: "14", name: "Fantasía" },
  { id: "27", name: "Terror" },
  { id: "10749", name: "Romance" },
  { id: "878", name: "Ciencia ficción" },
];

const LANGUAGES = [
  { code: "es", name: "Español" },
  { code: "en", name: "Inglés" },
  { code: "fr", name: "Francés" },
  { code: "it", name: "Italiano" },
  { code: "de", name: "Alemán" },
];

const SORT_OPTIONS = [
  { value: "popularity.desc", name: "Más populares" },
  { value: "vote_average.desc", name: "Mejor puntuadas" },
];

// Constantes para los filtros
const MIN_VOTE_COUNT = 5000; // Mínimo de votos para asegurar películas reconocidas
const MIN_POPULARITY = 10; // Mínimo de popularidad

const Battle = () => {
  const navigate = useNavigate();
  const [movies, setMovies] = useState<Movie[]>([]);
  const [winners, setWinners] = useState<Movie[]>([]);
  const [currentRound, setCurrentRound] = useState<number>(1);
  const [currentMatch, setCurrentMatch] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(true);
  const [config, setConfig] = useState<TournamentConfig>({
    genre: "all",
    yearFrom: 2000,
    yearTo: new Date().getFullYear(),
    language: "es",
    totalMovies: 8,
    sortBy: "popularity.desc"
  });

  const fetchMovies = async (config: TournamentConfig) => {
    setLoading(true);
    try {
      const pages = Math.ceil(config.totalMovies / 20) + 1;
      const requests = Array.from({ length: pages }, (_, i) =>
        axios.get('https://api.themoviedb.org/3/discover/movie', {
          params: {
            api_key: import.meta.env.VITE_TMDB_API_KEY,
            language: 'es-ES',
            sort_by: config.sortBy,
            page: i + 1,
            with_genres: config.genre === "all" ? undefined : config.genre,
            with_original_language: config.language,
            'primary_release_date.gte': `${config.yearFrom}-01-01`,
            'primary_release_date.lte': `${config.yearTo}-12-31`,
            'vote_count.gte': MIN_VOTE_COUNT, // Asegurar un mínimo de votos para todas las películas
            'vote_average.gte': config.sortBy === 'vote_average.desc' ? 7.0 : 0, // Mínimo 7 de puntuación para "Mejor puntuadas"
            'popularity.gte': MIN_POPULARITY, // Asegurar un mínimo de popularidad
          }
        })
      );

      const responses = await Promise.all(requests);
      let allMovies = responses.flatMap(response => response.data.results);
      
      // Si estamos buscando las mejor puntuadas, intentemos primero con películas muy populares
      if (config.sortBy === 'vote_average.desc') {
        allMovies = allMovies
          .sort((a, b) => {
            // Fórmula que combina puntuación y popularidad
            const scoreA = (a.vote_average * 2) + (Math.log10(a.popularity) * 3);
            const scoreB = (b.vote_average * 2) + (Math.log10(b.popularity) * 3);
            return scoreB - scoreA;
          });
      }

      const filteredMovies = allMovies
        .filter((movie: Movie) => movie.poster_path && movie.vote_average > 0)
        .slice(0, config.totalMovies);

      if (filteredMovies.length < config.totalMovies) {
        throw new Error('No hay suficientes películas con los filtros seleccionados');
      }

      setMovies(filteredMovies.sort(() => Math.random() - 0.5));
      setShowConfig(false);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar las películas');
      setLoading(false);
    }
  };

  const handleVote = (winner: Movie) => {
    const newWinners = [...winners, winner];
    setWinners(newWinners);

    if (currentMatch >= (movies.length / 2) - 1) {
      if (movies.length === 2) {
        const savedWinners = JSON.parse(localStorage.getItem('movieWinners') || '[]');
        localStorage.setItem('movieWinners', JSON.stringify([...savedWinners, winner]));
        navigate('/winner', { state: { winner, config } });
        return;
      }

      setMovies(newWinners);
      setWinners([]);
      setCurrentMatch(0);
      setCurrentRound(prev => prev + 1);
    } else {
      setCurrentMatch(prev => prev + 1);
    }
  };

  const handleStartTournament = () => {
    fetchMovies(config);
  };

  const getRoundName = (round: number, totalMovies: number) => {
    switch (totalMovies) {
      case 8: return round === 1 ? "Cuartos de Final" : "Semifinales";
      case 16: return round === 1 ? "Octavos de Final" : round === 2 ? "Cuartos de Final" : "Semifinales";
      case 32: return round === 1 ? "Dieciseisavos de Final" : round === 2 ? "Octavos de Final" : round === 3 ? "Cuartos de Final" : "Semifinales";
      case 4: return "Semifinales";
      case 2: return "Final";
      default: return `Ronda ${round}`;
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-xl">Cargando películas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <p className="text-xl text-red-500">{error}</p>
        <Button onClick={() => {
          setError(null);
          setShowConfig(true);
        }}>
          Volver a configurar
        </Button>
      </div>
    );
  }

  if (showConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-50 to-yellow-100 dark:from-black dark:to-green-900">
        <div className="w-full max-w-xl mx-auto bg-white/80 dark:bg-black/70 rounded-2xl shadow-2xl border border-yellow-200 dark:border-green-900 flex flex-col items-center p-10">
          <header className="text-center mb-8">
            <h1 className="text-4xl font-extrabold mb-2 text-gray-900 dark:text-green-200">Configurar Torneo</h1>
            <p className="text-lg text-gray-700 dark:text-gray-200">Personaliza tu torneo de películas</p>
          </header>
          <form className="w-full flex flex-col gap-6 items-center">
            <div className="w-full flex flex-col gap-2">
              <Label className="text-gray-800 dark:text-gray-200">Tipo de películas</Label>
              <Select value={config.sortBy} onValueChange={(value) => setConfig(prev => ({ ...prev, sortBy: value }))}>
                <SelectTrigger className="w-full max-w-md text-gray-900 placeholder-gray-400 bg-white dark:text-white dark:bg-black dark:placeholder-gray-400">
                  <SelectValue placeholder="Selecciona el tipo de películas" />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex flex-col gap-2">
              <Label className="text-gray-800 dark:text-gray-200">Género</Label>
              <Select value={config.genre} onValueChange={(value) => setConfig(prev => ({ ...prev, genre: value }))}>
                <SelectTrigger className="w-full max-w-md text-gray-900 placeholder-gray-400 bg-white dark:text-white dark:bg-black dark:placeholder-gray-400">
                  <SelectValue placeholder="Selecciona un género" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los géneros</SelectItem>
                  {GENRES.map(genre => (
                    <SelectItem key={genre.id} value={genre.id}>
                      {genre.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex flex-row gap-4">
              <div className="w-full max-w-md flex flex-col gap-2">
                <Label className="text-gray-800 dark:text-gray-200">Año desde</Label>
                <Input className="w-full text-gray-900 placeholder-gray-400 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-black" type="number" min="1900" max={config.yearTo} value={config.yearFrom} onChange={(e) => setConfig(prev => ({ ...prev, yearFrom: Number(e.target.value) }))} />
              </div>
              <div className="w-full max-w-md flex flex-col gap-2">
                <Label className="text-gray-800 dark:text-gray-200">Año hasta</Label>
                <Input className="w-full text-gray-900 placeholder-gray-400 dark:text-white dark:placeholder-gray-400 bg-white dark:bg-black" type="number" min={config.yearFrom} max={new Date().getFullYear()} value={config.yearTo} onChange={(e) => setConfig(prev => ({ ...prev, yearTo: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="w-full flex flex-col gap-2">
              <Label className="text-gray-800 dark:text-gray-200">Idioma</Label>
              <Select value={config.language} onValueChange={(value) => setConfig(prev => ({ ...prev, language: value }))}>
                <SelectTrigger className="w-full max-w-md text-gray-900 placeholder-gray-400 bg-white dark:text-white dark:bg-black dark:placeholder-gray-400">
                  <SelectValue placeholder="Selecciona un idioma" />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="w-full flex flex-col gap-2">
              <Label className="text-gray-800 dark:text-gray-200">Número de películas</Label>
              <Select value={config.totalMovies.toString()} onValueChange={(value) => setConfig(prev => ({ ...prev, totalMovies: Number(value) }))}>
                <SelectTrigger className="w-full max-w-md text-gray-900 placeholder-gray-400 bg-white dark:text-white dark:bg-black dark:placeholder-gray-400">
                  <SelectValue placeholder="Selecciona la cantidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 películas</SelectItem>
                  <SelectItem value="16">16 películas</SelectItem>
                  <SelectItem value="32">32 películas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              className="w-full max-w-md mt-6 font-semibold rounded-xl shadow-md transition text-lg bg-gradient-to-r dark:from-green-800 dark:to-green-500 dark:text-white from-yellow-400 to-yellow-200 text-gray-900"
              onClick={handleStartTournament}
            >
              Comenzar Torneo
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const currentMovies = movies.slice(currentMatch * 2, (currentMatch * 2) + 2);

  return (
    <div className="min-h-screen bg-transparent p-4 flex flex-col items-center text-gray-900 dark:text-gray-100">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-center">{getRoundName(currentRound, movies.length)}</h1>
        <p className="text-sm text-muted-foreground text-center mt-2">
          Enfrentamiento {currentMatch + 1} de {movies.length / 2}
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {currentMovies.map((movie) => (
          <div key={movie.id} className="flex flex-col items-center">
            <Card className="w-full max-w-sm hover:shadow-lg transition-shadow cursor-pointer" onClick={() => handleVote(movie)}>
              <CardContent className="p-0">
                <img
                  src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                  alt={movie.title}
                  className="w-full aspect-[2/3] object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{movie.title}</h3>
                  <div className="flex justify-between text-sm">
                    <span>{new Date(movie.release_date).getFullYear()}</span>
                    <span>⭐ {movie.vote_average.toFixed(1)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Button 
              className="mt-4 w-full max-w-sm"
              onClick={() => handleVote(movie)}
            >
              Votar por esta película
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Battle; 