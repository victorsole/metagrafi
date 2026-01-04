import Icon from '@mdi/react'
import { mdiLinkedin, mdiGithub, mdiWeb } from '@mdi/js'

export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-700 text-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo and tagline */}
          <div className="text-center md:text-left flex flex-col items-center md:items-start gap-3">
            <a
              href="https://beresol.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:opacity-80 transition-opacity"
            >
              <img
                src="/metagrafi-beresol.png"
                alt="Metagrafi by Beresol"
                className="h-10 w-auto"
              />
            </a>
            <p className="text-gray-300 text-sm">
              Metagrafi, a product of{' '}
              <a
                href="https://beresol.eu"
                target="_blank"
                rel="noopener noreferrer"
                className="text-white hover:underline"
              >
                Beresol
              </a>
            </p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://beresol.eu"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="Website"
            >
              <Icon path={mdiWeb} size={1} />
            </a>
            <a
              href="https://linkedin.com/company/beresol"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="LinkedIn"
            >
              <Icon path={mdiLinkedin} size={1} />
            </a>
            <a
              href="https://github.com/victorsole"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-300 hover:text-white transition-colors"
              aria-label="GitHub"
            >
              <Icon path={mdiGithub} size={1} />
            </a>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-gray-600 text-center text-gray-300 text-sm">
          <p>&copy; {currentYear} Beresol. All rights reserved.</p>
        </div>
      </div>
    </footer>
  )
}
