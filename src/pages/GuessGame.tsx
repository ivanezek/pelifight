import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Trophy } from "lucide-react";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
}

interface PlayerRecord {
  name: string;
  score: number;
  date: string;
}

interface GameRound {
  movies: [Movie, Movie];
  guess: number | null;
  isCorrect: boolean | null;
}

const GuessGame = () => {
  const [allRounds, setAllRounds] = useState<GameRound[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [gameEnded, setGameEnded] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showStart, setShowStart] = useState(true);
  const [topRecords, setTopRecords] = useState<PlayerRecord[]>([]);

  useEffect(() => {
    const savedName = localStorage.getItem('guessGamePlayerName');
    if (savedName) {
      setPlayerName(savedName);
    }
    loadTopRecords();
  }, []);

  const loadTopRecords = () => {
    const records = JSON.parse(localStorage.getItem('guessGameRecords') || '[]');
    setTopRecords(records.sort((a: PlayerRecord, b: PlayerRecord) => b.score - a.score).slice(0, 5));
  };

  const handleStartGame = () => {
    if (!playerName.trim()) return;
    localStorage.setItem('guessGamePlayerName', playerName);
    setShowStart(false);
    fetchAllPairs();
  };

  const updateRecords = (finalScore: number) => {
    const records: PlayerRecord[] = JSON.parse(localStorage.getItem('guessGameRecords') || '[]');
    const newRecord: PlayerRecord = {
      name: playerName,
      score: finalScore,
      date: new Date().toISOString()
    };
    
    records.push(newRecord);
    records.sort((a, b) => b.score - a.score);
    const topRecords = records.slice(0, 50);
    localStorage.setItem('guessGameRecords', JSON.stringify(topRecords));
    setTopRecords(topRecords.slice(0, 5));
  };

  const fetchAllPairs = async () => {
    setLoading(true);
    try {
      // Obtener el total de páginas disponibles primero
      const initialResponse = await axios.get('https://api.themoviedb.org/3/discover/movie', {
        params: {
          api_key: import.meta.env.VITE_TMDB_API_KEY,
          language: 'es-ES',
          sort_by: 'vote_count.desc', // Ordenar por número de votos para obtener películas populares
          'vote_count.gte': 3000,
          'vote_average.gte': 6,
        }
      });

      const totalPages = Math.min(initialResponse.data.total_pages, 20); // Limitar a 20 páginas máximo
      const randomPages = new Set<number>();
      
      // Seleccionar 4 páginas aleatorias diferentes
      while (randomPages.size < 4) {
        randomPages.add(Math.floor(Math.random() * totalPages) + 1);
      }

      // Obtener películas de cada página aleatoria
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

      const responses = await Promise.all(moviePromises);
      const allMovies = responses
        .flatMap(response => response.data.results)
        .filter((movie: Movie) => movie.poster_path && movie.vote_average > 0)
        .sort(() => Math.random() - 0.5)
        .slice(0, 20);

      const rounds: GameRound[] = [];
      for (let i = 0; i < 10; i++) {
        rounds.push({
          movies: [allMovies[i * 2], allMovies[i * 2 + 1]],
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

  const handleGuess = (movieId: number) => {
    if (!allRounds[currentRound] || allRounds[currentRound].guess !== null) return;

    const round = allRounds[currentRound];
    const selectedMovie = round.movies.find(m => m.id === movieId);
    const otherMovie = round.movies.find(m => m.id !== movieId);
    
    if (!selectedMovie || !otherMovie) return;

    // Redondear a un decimal para comparación más justa
    const selectedScore = Math.round(selectedMovie.vote_average * 10) / 10;
    const otherScore = Math.round(otherMovie.vote_average * 10) / 10;
    const isCorrectGuess = selectedScore >= otherScore;

    const updatedRounds = [...allRounds];
    updatedRounds[currentRound] = {
      ...round,
      guess: movieId,
      isCorrect: isCorrectGuess
    };

    setAllRounds(updatedRounds);
    setShowResult(true);

    if (isCorrectGuess) {
      setScore(prev => prev + 1);
    }

    setTimeout(() => {
      setShowResult(false);
      if (currentRound === 9) {
        setGameEnded(true);
        updateRecords(score + (isCorrectGuess ? 1 : 0));
      } else {
        setCurrentRound(prev => prev + 1);
      }
    }, 1500);
  };

  const handlePlayAgain = () => {
    fetchAllPairs();
  };

  if (showStart) {
    return (
      <div className="min-h-screen bg-[rgb(182,134,151)] p-4 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-gray-900">Modo Versus</h1>
            <p className="text-lg font-medium text-gray-800">¿Puedes adivinar qué película está mejor puntuada?</p>
            <p className="text-md text-gray-600">10 rondas - ¡Consigue la mayor puntuación!</p>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="playerName" className="text-sm font-medium text-gray-700">
                Nombre del jugador
              </label>
              <Input
                id="playerName"
                type="text"
                placeholder="Ingresa tu nombre"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="w-full bg-white border-2 border-gray-200 focus:border-purple-500 text-gray-900 placeholder:text-gray-400"
              />
            </div>

            <Button 
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={handleStartGame}
              disabled={!playerName.trim()}
            >
              Comenzar Juego
            </Button>
          </div>

          {topRecords.length > 0 && (
            <div className="mt-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Mejores Puntuaciones
              </h2>
              <div className="space-y-2">
                {topRecords.map((record, index) => (
                  <div 
                    key={index}
                    className="flex justify-between items-center p-3 rounded-lg bg-gray-100 border border-gray-200"
                  >
                    <span className="font-semibold text-gray-900">{record.name}</span>
                    <span className="text-purple-600 font-bold">{record.score}/10 puntos</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading || !allRounds.length) {
    return (
      <div className="h-screen flex items-center justify-center bg-[rgb(182,134,151)]">
        <p className="text-xl text-white">Cargando películas...</p>
      </div>
    );
  }

  if (gameEnded) {
    return (
      <div className="min-h-screen bg-[rgb(182,134,151)] p-4 flex items-center justify-center">
        <div className="max-w-md w-full space-y-8 bg-white/95 backdrop-blur-sm p-8 rounded-2xl shadow-xl text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">¡Juego terminado!</h1>
          <p className="text-xl mb-6">Tu puntuación final: {score}/10</p>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              {allRounds.map((round, index) => (
                <div 
                  key={index}
                  className={`p-3 rounded-lg ${
                    round.isCorrect ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'
                  } border`}
                >
                  <p className="font-medium">Ronda {index + 1}</p>
                  <p className="text-sm">
                    {round.isCorrect ? '✅ Correcto' : '❌ Incorrecto'}
                  </p>
                </div>
              ))}
            </div>
            
            <Button
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              onClick={handlePlayAgain}
            >
              Jugar de nuevo
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentMovies = allRounds[currentRound].movies;

  return (
    <div className="min-h-screen bg-[rgb(182,134,151)] p-4">
      <header className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2 text-white">¿Cuál está mejor puntuada?</h1>
        <div className="flex justify-center gap-4 text-white">
          <p className="text-lg">Jugador: {playerName}</p>
          <p className="text-lg">Ronda: {currentRound + 1}/10</p>
          <p className="text-lg">Puntuación: {score}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
        {currentMovies.map((movie) => (
          <motion.div
            key={movie.id}
            className="flex flex-col items-center"
            initial={{ scale: 1 }}
            animate={{
              scale: showResult && allRounds[currentRound].guess === movie.id ? 1.05 : 1,
              border: showResult && allRounds[currentRound].guess === movie.id
                ? allRounds[currentRound].isCorrect
                  ? '4px solid #22c55e'
                  : '4px solid #ef4444'
                : '4px solid transparent',
            }}
            transition={{ duration: 0.3 }}
          >
            <Card 
              className="w-full max-w-sm hover:shadow-lg transition-shadow cursor-pointer relative overflow-hidden"
              onClick={() => handleGuess(movie.id)}
            >
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
                    {showResult && (
                      <span>⭐ {Math.round(movie.vote_average * 10) / 10}</span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {showResult && (
        <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2">
          <motion.div
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className={`px-6 py-3 rounded-full text-white ${
              allRounds[currentRound].isCorrect ? 'bg-green-500' : 'bg-red-500'
            }`}
          >
            {allRounds[currentRound].isCorrect ? '¡Correcto! +1 punto' : '¡Incorrecto!'}
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GuessGame; 