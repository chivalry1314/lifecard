import { Routes, Route } from 'react-router'
import Home from './pages/Home'
import Room from './pages/Room'
import Report from './pages/Report'
import SoloGame from './pages/SoloGame'
import SoloReport from './pages/SoloReport'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/room/:roomId" element={<Room />} />
      <Route path="/room/:roomId/report" element={<Report />} />
      <Route path="/solo" element={<SoloGame />} />
      <Route path="/solo/report" element={<SoloReport />} />
    </Routes>
  )
}
