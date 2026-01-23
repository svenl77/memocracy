interface SocialLinksProps {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
  github?: string;
}

export default function SocialLinks({
  website,
  twitter,
  telegram,
  discord,
  github,
}: SocialLinksProps) {
  const links = [
    {
      url: website,
      icon: "🌐",
      label: "Website",
      color: "from-blue-500 to-blue-600",
      hoverColor: "hover:from-blue-600 hover:to-blue-700",
    },
    {
      url: twitter,
      icon: "𝕏",
      label: "Twitter/X",
      color: "from-black to-gray-800",
      hoverColor: "hover:from-gray-800 hover:to-gray-900",
    },
    {
      url: telegram,
      icon: "💬",
      label: "Telegram",
      color: "from-sky-500 to-sky-600",
      hoverColor: "hover:from-sky-600 hover:to-sky-700",
    },
    {
      url: discord,
      icon: "💬",
      label: "Discord",
      color: "from-indigo-500 to-indigo-600",
      hoverColor: "hover:from-indigo-600 hover:to-indigo-700",
    },
    {
      url: github,
      icon: "💻",
      label: "GitHub",
      color: "from-gray-600 to-gray-700",
      hoverColor: "hover:from-gray-700 hover:to-gray-800",
    },
  ].filter((link) => link.url);

  if (links.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 mt-4">
      <span className="text-sm font-semibold text-gray-700 mr-1">
        Links:
      </span>
      {links.map((link, index) => (
        <a
          key={index}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`
            flex items-center gap-2 px-4 py-2 rounded-xl
            bg-gradient-to-r ${link.color} ${link.hoverColor}
            text-white font-medium text-sm
            transition-all duration-200 shadow-md hover:shadow-lg
            transform hover:scale-105 active:scale-95
          `}
        >
          <span className="text-lg">{link.icon}</span>
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
