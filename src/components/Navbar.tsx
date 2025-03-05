import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  // Function to check if a path is active
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <nav className="bg-[#1a1f35] shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link to="/agencies" className="flex items-center">
              <span className="text-xl font-bold text-white">ECFR Dashboard</span>
            </Link>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/agencies" 
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/agencies') 
                  ? 'bg-blue-700 text-white' 
                  : 'text-gray-300 hover:bg-[#232939] hover:text-white'
              }`}
            >
              Agencies
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 