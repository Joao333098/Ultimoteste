import { Bell, User } from "lucide-react";

export default function Header() {
  return (
    <header className="glass-card sticky top-0 z-50 border-0 border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-glow animate-float">
              <i className="fas fa-microphone-alt text-white text-xl"></i>
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/80 bg-clip-text text-transparent">
          VoiceTrans
        </h1>
              <p className="text-sm text-white/80 font-medium">Transcrição Inteligente em Tempo Real</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center space-x-8">
            <a href="#" className="text-white/80 hover:text-white transition-all duration-300 font-medium text-sm uppercase tracking-wide hover:scale-105">Início</a>
            <a href="#" className="text-white/80 hover:text-white transition-all duration-300 font-medium text-sm uppercase tracking-wide hover:scale-105">Recursos</a>
            <a href="#" className="text-white/80 hover:text-white transition-all duration-300 font-medium text-sm uppercase tracking-wide hover:scale-105">Histórico</a>
            <a href="#" className="text-white/80 hover:text-white transition-all duration-300 font-medium text-sm uppercase tracking-wide hover:scale-105">Configurações</a>
          </nav>

          <div className="flex items-center space-x-4">
            <button 
              data-testid="button-notifications"
              className="p-3 text-white/80 hover:text-white transition-all duration-300 hover:scale-110 rounded-xl hover:bg-white/10"
            >
              <Bell className="h-5 w-5" />
            </button>
            <div className="w-10 h-10 bg-gradient-secondary rounded-full flex items-center justify-center shadow-medium hover:scale-110 transition-transform duration-300 cursor-pointer">
              <User className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}