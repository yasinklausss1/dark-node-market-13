import { ExternalLink, Users, Shield, CheckCircle } from 'lucide-react';

const TelegramAdBanner = () => {
  return (
    <div className="mb-6">
      {/* Trust Text Above Banner */}
      <div className="text-center mb-3">
        <p className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-2xl mx-auto">
          <Shield className="inline-block h-4 w-4 mr-1 text-primary" />
          In dieser Gruppe sind nur zuverlässige und vertrauenswürdige Verkäufer vertreten, sodass ihr euch auf faire und sichere Geschäfte verlassen könnt.
        </p>
      </div>

      {/* Ad Banner */}
      <a
        href="https://t.me/+BJSbVCkJgloyYWI6"
        target="_blank"
        rel="noopener noreferrer"
        className="block group relative overflow-hidden rounded-xl border border-border bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 hover:from-primary/15 hover:via-primary/10 hover:to-accent/15 transition-all duration-300"
      >
        {/* Subtle Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, hsl(var(--primary)) 1px, transparent 1px),
                              radial-gradient(circle at 80% 50%, hsl(var(--primary)) 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        <div className="relative px-4 py-5 md:px-8 md:py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Left Content */}
            <div className="flex items-center gap-4">
              {/* Telegram Icon */}
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-[#0088cc] flex items-center justify-center shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <svg viewBox="0 0 24 24" className="w-6 h-6 md:w-7 md:h-7 text-white fill-current">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.75 4.02-1.75 6.7-2.9 8.04-3.47 3.83-1.6 4.62-1.88 5.14-1.89.11 0 .37.03.54.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
                </svg>
              </div>

              {/* Text Content */}
              <div className="text-center md:text-left">
                <h3 className="text-lg md:text-xl font-bold text-foreground mb-1 group-hover:text-primary transition-colors">
                  Verifizierte Verkäufer Gruppe
                </h3>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    Geprüft
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-primary" />
                    Sicher
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-blue-500" />
                    Community
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex items-center gap-2 bg-[#0088cc] hover:bg-[#0077b5] text-white px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md group-hover:shadow-lg">
              <span>Jetzt beitreten</span>
              <ExternalLink className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Werbung Badge */}
        <div className="absolute top-2 right-2 px-2 py-0.5 bg-muted/80 backdrop-blur-sm rounded text-[10px] text-muted-foreground uppercase tracking-wider">
          Werbung
        </div>
      </a>
    </div>
  );
};

export default TelegramAdBanner;
