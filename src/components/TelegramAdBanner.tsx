import telegramBanner from '@/assets/telegram-ad-banner.jpg';

const TelegramAdBanner = () => {
  return (
    <div className="mb-6">
      {/* Clickable Banner Image */}
      <a
        href="https://t.me/+BJSbVCkJgloyYWI6"
        target="_blank"
        rel="noopener noreferrer"
        className="block relative rounded-xl overflow-hidden hover:opacity-95 transition-opacity border-2 border-white"
      >
        <img
          src={telegramBanner}
          alt="Telegram Gruppe beitreten"
          className="w-full h-auto object-cover"
        />
        
        {/* Text Overlay at Bottom */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/50 to-transparent px-4 py-4 md:py-5">
          <p className="text-white text-xs md:text-sm text-center leading-relaxed max-w-2xl mx-auto">
            In dieser Gruppe sind nur zuverlässige und vertrauenswürdige Verkäufer vertreten, sodass ihr euch auf faire und sichere Geschäfte verlassen könnt.
          </p>
        </div>
        
        {/* Werbung Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white uppercase tracking-wider">
          Werbung
        </div>
      </a>
    </div>
  );
};

export default TelegramAdBanner;
