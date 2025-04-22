# Mundial de Películas 🎬

Una aplicación web interactiva que permite a los usuarios participar en un torneo de eliminación directa con las mejores películas según TMDb.

## Características

- Torneo de eliminación directa con las 32 mejores películas
- Interfaz moderna y responsive
- Animaciones suaves con Framer Motion
- Integración con la API de TMDb
- Votación interactiva
- Diseño con Tailwind CSS

## Requisitos Previos

- Node.js (versión 14 o superior)
- npm o yarn
- Una API key de TMDb (puedes obtenerla en [https://www.themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))

## Instalación

1. Clona este repositorio:
```bash
git clone [url-del-repositorio]
cd mundial-peliculas
```

2. Instala las dependencias:
```bash
npm install
```

3. Crea un archivo `.env` en la raíz del proyecto y agrega tu API key de TMDb:
```
VITE_TMDB_API_KEY=tu_api_key_aqui
```

4. Inicia el servidor de desarrollo:
```bash
npm run dev
```

## Uso

1. Abre tu navegador y ve a `http://localhost:5173`
2. Haz clic en "Iniciar Torneo" para comenzar
3. En cada ronda, vota por tu película favorita
4. Continúa votando hasta que quede una película ganadora

## Tecnologías Utilizadas

- React
- TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- React Router
- Axios

## Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue para discutir qué te gustaría cambiar.

## Licencia

MIT 