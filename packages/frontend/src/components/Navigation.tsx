import { Link, useNavigate } from 'react-router-dom';

interface NavigationProps {
  title?: string;
  showBack?: boolean;
  backPath?: string;
  children?: React.ReactNode;
}

export default function Navigation({ title, showBack = true, backPath, children }: NavigationProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  return (
    <nav className="bg-hawk-purple text-white shadow-lg mb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            {showBack && (
              <button
                onClick={handleBack}
                className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
                aria-label="Go back"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <span className="font-medium">Back</span>
              </button>
            )}
            {title && (
              <h1 className="text-xl font-bold">{title}</h1>
            )}
          </div>

          <div className="flex items-center gap-4">
            {children}
            <Link
              to="/"
              className="flex items-center gap-2 text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="font-medium">Home</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
