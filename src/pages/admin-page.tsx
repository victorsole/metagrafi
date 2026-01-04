import { useState, FormEvent } from 'react'
import { AdminPanel } from '../components/admin-panel'

export function AdminPage() {
  const [secret, setSecret] = useState('')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [inputSecret, setInputSecret] = useState('')

  const handleLogin = (e: FormEvent) => {
    e.preventDefault()
    if (inputSecret.trim()) {
      setSecret(inputSecret.trim())
      setIsAuthenticated(true)
    }
  }

  const handleLogout = () => {
    setSecret('')
    setIsAuthenticated(false)
    setInputSecret('')
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-beresol-green text-white py-4 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/" className="flex items-center gap-2 hover:opacity-80">
              <img
                src="/metagrafi.png"
                alt="Metagrafi"
                className="h-8 w-auto"
              />
              <span className="font-semibold">Metagrafi Admin</span>
            </a>
          </div>
          {isAuthenticated && (
            <button
              onClick={handleLogout}
              className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {!isAuthenticated ? (
            <div className="max-w-md mx-auto">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-beresol-black mb-6 text-center">
                  Admin Access
                </h1>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label htmlFor="secret" className="block text-sm font-medium text-gray-700 mb-2">
                      Admin Secret
                    </label>
                    <input
                      type="password"
                      id="secret"
                      value={inputSecret}
                      onChange={(e) => setInputSecret(e.target.value)}
                      placeholder="Enter admin secret"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-beresol-green focus:border-transparent outline-none"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!inputSecret.trim()}
                    className="w-full py-3 px-6 bg-beresol-green text-white font-semibold rounded-lg hover:bg-beresol-green-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Access Dashboard
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <AdminPanel secret={secret} />
          )}
        </div>
      </main>
    </div>
  )
}
