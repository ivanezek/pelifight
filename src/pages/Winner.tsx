import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Movie {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
  release_date: string;
  actors?: string[];
}

const Winner = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const winner = location.state?.winner as Movie;
  const savedWinners = JSON.parse(localStorage.getItem('movieWinners') || '[]');

  if (!winner) {
    navigate('/');
    return null;
  }

  const handleRematch = () => {
    navigate('/battle', { state: { rematch: true } });
  };

  const handleNewTournament = () => {
    navigate('/battle');
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8 max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-8"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  className="inline-block text-4xl mb-2"
                >
                  🏆
                </motion.div>
                <h1 className="text-3xl font-bold">¡Película Ganadora!</h1>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="aspect-[2/3] relative rounded-lg overflow-hidden"
                >
                  <img
                    src={`https://image.tmdb.org/t/p/w500${winner.poster_path}`}
                    alt={winner.title}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                </motion.div>

                <div className="space-y-6">
                  <div>
                    <h2 className="text-2xl font-bold">{winner.title}</h2>
                    <p className="text-muted-foreground">
                      {new Date(winner.release_date).getFullYear()}
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-yellow-500">⭐</span>
                      <span>{winner.vote_average.toFixed(1)}</span>
                    </div>
                    {winner.actors && (
                      <p className="text-sm text-muted-foreground">
                        {winner.actors.join(', ')}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4">
                    <Button
                      onClick={handleRematch}
                      className="flex-1"
                    >
                      ¡Revancha!
                    </Button>
                    <Button
                      onClick={handleNewTournament}
                      variant="outline"
                      className="flex-1"
                    >
                      Nuevo Torneo
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {savedWinners.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-6">
                  <span className="text-2xl">🌟</span>
                  <h2 className="text-2xl font-bold">Salón de la Fama</h2>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {savedWinners.map((movie: Movie, index: number) => (
                    <motion.div
                      key={`${movie.id}-${index}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="group relative"
                    >
                      <div className="aspect-[2/3] rounded-lg overflow-hidden">
                        <img
                          src={`https://image.tmdb.org/t/p/w500${movie.poster_path}`}
                          alt={movie.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-3">
                          <div className="text-center">
                            <p className="text-sm font-medium text-white mb-1 line-clamp-2">
                              {movie.title}
                            </p>
                            <p className="text-xs text-gray-300">
                              {new Date(movie.release_date).getFullYear()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Winner; 