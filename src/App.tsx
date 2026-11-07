import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';

const AllTools = lazy(() => import('./pages/AllTools'));
const Categories = lazy(() => import('./pages/Categories'));
const CategoryPage = lazy(() => import('./pages/CategoryPage'));
const ToolPage = lazy(() => import('./pages/ToolPage'));
const Privacy = lazy(() => import('./pages/Privacy'));
const Formats = lazy(() => import('./pages/Formats'));
const Roadmap = lazy(() => import('./pages/Roadmap'));
const About = lazy(() => import('./pages/About'));
const Settings = lazy(() => import('./pages/Settings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export function App() {
  return (
    <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="tools" element={<AllTools />} />
          <Route path="tools/:slug" element={<ToolPage />} />
          <Route path="categories" element={<Categories />} />
          <Route path="categories/:id" element={<CategoryPage />} />
          <Route path="privacy" element={<Privacy />} />
          <Route path="formats" element={<Formats />} />
          <Route path="roadmap" element={<Roadmap />} />
          <Route path="about" element={<About />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Route>
    </Routes>
  );
}
