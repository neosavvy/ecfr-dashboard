import React from 'react';
import { Github } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-800 mt-8 py-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Resources</h3>
            <div className="space-y-2">
            <a 
              href="https://www.ecfr.gov/developers/documentation/api/v1#/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              eCFR API Docs
            </a>
            <a 
              href="https://www.ecfr.gov/"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-400 hover:text-blue-300 transition-colors"
            >
              eCFR Website
            </a>
            </div>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Source Code</h3>
            <div className="space-y-2">
              <a 
                href="https://github.com/neosavvy/ecfr-dashboard"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Github className="h-4 w-4" />
                Dashboard Repository
              </a>
              <a 
                href="https://github.com/neosavvy/ecfr-analyzer"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-blue-400 hover:text-blue-300 transition-colors"
              >
                <Github className="h-4 w-4" />
                Server Repository
              </a>
            </div>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">About</h3>
            <p className="text-gray-400 mb-4">
              This dashboard provides analytics and insights into the complexity and structure of federal regulations.
            </p>
          </div>
          <div>
            <h3 className="text-gray-300 font-semibold mb-3">Legal</h3>
            <p className="text-gray-400">
              Copyright © 2025 Adam Parrish aka Neosavvy
            </p>
            <p className="text-gray-500 text-sm mt-2">
              Data provided by the U.S. Government Publishing Office via eCFR API.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}