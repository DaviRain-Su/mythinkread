import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import CreateBookPage from './pages/create/CreateBookPage'
import BookDetailPage from './pages/BookDetailPage'
import BookReaderPage from './pages/BookReaderPage'
import BooksPage from './pages/BooksPage'
import RankingsPage from './pages/RankingsPage'
import BooklistsPage from './pages/BooklistsPage'
import BooklistDetailPage from './pages/BooklistDetailPage'
import ProfilePage from './pages/ProfilePage'
import FeedPage from './pages/FeedPage'
import SearchPage from './pages/SearchPage'
import RecommendationsPage from './pages/RecommendationsPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AnalyticsPage from './pages/analytics/AnalyticsPage'
import DaoPage from './pages/dao/DaoPage'
import PublicDomainBooksPage from './pages/public-domain/PublicDomainBooksPage'
import BlogPage from './pages/blog/BlogPage'
import BlogSettingsPage from './pages/blog/BlogSettingsPage'
import CollaboratePage from './pages/collaborate/CollaboratePage'
import Navbar from './components/Navbar'

function App() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f9fafb' }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/create" element={<CreateBookPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:bookId" element={<BookDetailPage />} />
        <Route path="/books/:bookId/read/:chapterId" element={<BookReaderPage />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/booklists" element={<BooklistsPage />} />
        <Route path="/booklists/:id" element={<BooklistDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/dao" element={<DaoPage />} />
        <Route path="/public-domain" element={<PublicDomainBooksPage />} />
        <Route path="/blog/:subdomain" element={<BlogPage />} />
        <Route path="/blog-settings" element={<BlogSettingsPage />} />
        <Route path="/collaborate/:docId" element={<CollaboratePage />} />
      </Routes>
    </div>
  )
}

export default App
