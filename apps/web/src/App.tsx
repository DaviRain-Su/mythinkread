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
import CreatorStudioPage from './pages/studio/CreatorStudioPage'
import SocialPage from './pages/social/SocialPage'
import DashboardPage from './pages/dashboard/DashboardPage'
import WikiPage from './pages/wiki/WikiPage'
import WikiEntityPage from './pages/wiki/WikiEntityPage'
import WikiTimelinePage from './pages/wiki/WikiTimelinePage'
import ReaderXLPage from './pages/reader/ReaderXLPage'
import AudioV2Page from './pages/audio/AudioV2Page'
import PublishGatePage from './pages/publish/PublishGatePage'
import LeaderboardsPage from './pages/leaderboards/LeaderboardsPage'
import OnboardingPage from './pages/onboarding/OnboardingPage'
import MobileReaderPage from './pages/mobile/MobileReaderPage'
import MobileDiscoveryPage from './pages/mobile/MobileDiscoveryPage'
import HighlightCardPage from './pages/mobile/HighlightCardPage'
import VoiceRoomPage from './pages/voice/VoiceRoomPage'
import ObsidianExportPage from './pages/export/ObsidianExportPage'
import WikiCoEditPage from './pages/wiki/WikiCoEditPage'
import Navbar from './components/Navbar'

function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--paper)' }}>
      <Navbar />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/create" element={<CreateBookPage />} />
        <Route path="/studio" element={<CreatorStudioPage />} />
        <Route path="/books" element={<BooksPage />} />
        <Route path="/books/:bookId" element={<BookDetailPage />} />
        <Route path="/books/:bookId/read/:chapterId" element={<BookReaderPage />} />
        <Route path="/reader-xl" element={<ReaderXLPage />} />
        <Route path="/audio" element={<AudioV2Page />} />
        <Route path="/rankings" element={<RankingsPage />} />
        <Route path="/leaderboards" element={<LeaderboardsPage />} />
        <Route path="/booklists" element={<BooklistsPage />} />
        <Route path="/booklists/:id" element={<BooklistDetailPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/social" element={<SocialPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/recommendations" element={<RecommendationsPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/admin" element={<AdminDashboardPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/dao" element={<DaoPage />} />
        <Route path="/public-domain" element={<PublicDomainBooksPage />} />
        <Route path="/blog/:subdomain" element={<BlogPage />} />
        <Route path="/blog-settings" element={<BlogSettingsPage />} />
        <Route path="/collaborate/:docId" element={<CollaboratePage />} />
        <Route path="/wiki" element={<WikiPage />} />
        <Route path="/wiki/entity" element={<WikiEntityPage />} />
        <Route path="/wiki/timeline" element={<WikiTimelinePage />} />
        <Route path="/wiki/coedit" element={<WikiCoEditPage />} />
        <Route path="/publish" element={<PublishGatePage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/mobile/reader" element={<MobileReaderPage />} />
        <Route path="/mobile/discovery" element={<MobileDiscoveryPage />} />
        <Route path="/mobile/highlight" element={<HighlightCardPage />} />
        <Route path="/voice" element={<VoiceRoomPage />} />
        <Route path="/export" element={<ObsidianExportPage />} />
      </Routes>
    </div>
  )
}

export default App
