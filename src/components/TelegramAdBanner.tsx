import telegramBanner from '@/assets/telegram-ad-banner.jpg';

const TelegramAdBanner = () => {
  return (
    <div className="mb-6">
      {/* Single bordered container with text header and image */}
      <a
        href="https://t.me/+BJSbVCkJgloyYWI6"
        target="_blank"
        rel="noopener noreferrer"
        className="block relative rounded-xl overflow-hidden hover:opacity-95 transition-opacity border-2 border-white"
      >
        {/* Trust Text Header inside the box */}
        <div className="bg-black/70 backdrop-blur-sm px-4 py-3">
          <p className="text-center text-xs md:text-sm text-white/90 leading-relaxed">
            In dieser Gruppe sind nur zuverlässige und vertrauenswürdige Verkäufer vertreten, sodass ihr euch auf faire und sichere Geschäfte verlassen könnt.
          </p>
        </div>

        {/* Banner Image */}
        <img
          src={telegramBanner}
          alt="Telegram Gruppe beitreten"
          className="w-full h-auto object-cover"
        />
        
        {/* Werbung Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] text-white uppercase tracking-wider">
          Werbung
        </div>
      </a>
    </div>
  );
};

export default TelegramAdBanner;
