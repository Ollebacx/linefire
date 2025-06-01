
import React from 'react';
import { ChampionChoice, AllyType } from '../types'; 
import { UI_BACKGROUND_NEUTRAL, UI_STROKE_PRIMARY, UI_STROKE_SECONDARY, PLAYER_SIZE, ALLY_SIZE } from '../constants'; 

interface ChampionSelectScreenProps {
  champions: ChampionChoice[];
  onSelectChampion: (choiceId: ChampionChoice['id']) => void;
  onGoBack: () => void; 
}

const ChampionGFXPreview: React.FC<{ championId: ChampionChoice['id'] }> = ({ championId }) => {
  const commonProps = { stroke: UI_STROKE_PRIMARY, strokeWidth: "1.5px", fill: "none" };
  const previewSizeBase = championId === 'GUN_GUY' ? PLAYER_SIZE : ALLY_SIZE;
  const w = previewSizeBase.width * 0.9; 
  const h = previewSizeBase.height * 0.9;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(cx, cy) * 0.75; 
  const baseLineLen = r * 1.2; 

  let gfx = <line x1={cx} y1={cy} x2={cx + baseLineLen} y2={cy} {...commonProps} />; 

  switch (championId) {
    case AllyType.RIFLEMAN: 
        gfx = <line x1={cx} y1={cy} x2={cx + baseLineLen * 1.1} y2={cy} {...commonProps} />;
        break;
    case AllyType.SHOTGUN:
      gfx = (<g>
          <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy - baseLineLen * 0.35} {...commonProps} />
          <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.9} y2={cy} {...commonProps} />
          <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy + baseLineLen * 0.35} {...commonProps} />
        </g>);
      break;
    case AllyType.SNIPER:
      gfx = <line x1={cx} y1={cy} x2={cx + baseLineLen * 2.2} y2={cy} {...commonProps} />;
      break;
    case AllyType.MINIGUNNER:
      const minigunLineLen = baseLineLen * 1.1;
      const crossBarLen = baseLineLen * 0.4;
      gfx = (
        <g>
          <line x1={cx} y1={cy} x2={cx + minigunLineLen} y2={cy} {...commonProps} />
          <line x1={cx + minigunLineLen} y1={cy - crossBarLen/2} x2={cx + minigunLineLen} y2={cy + crossBarLen/2} {...commonProps} />
        </g>
      );
      break;
    case AllyType.RPG_SOLDIER:
      gfx = (
        <g>
          <line x1={cx} y1={cy} x2={cx + baseLineLen * 0.8} y2={cy} {...commonProps} strokeWidth={"2.5px"} />
          <rect x={cx + baseLineLen * 0.8} y={cy - 2.5} width="5" height="5" {...commonProps} fill={UI_BACKGROUND_NEUTRAL} strokeWidth={"1.5px"}/>
        </g>
      );
      break;
    case AllyType.FLAMER:
      gfx = (
        <g>
          {[ -30, 0, 30].map(angle => (
               <path key={angle} d={`M ${cx},${cy} Q ${cx + baseLineLen*0.6},${cy + Math.tan(angle * Math.PI / 180) * baseLineLen*0.4} ${cx + baseLineLen*1.0},${cy + Math.tan(angle * Math.PI / 180) * baseLineLen*0.7}`} {...commonProps} />
          ))}
        </g>
      );
      break;
  }

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="mb-2 sm:mb-3">
      <circle cx={cx} cy={cy} r={r} {...commonProps} fill={UI_BACKGROUND_NEUTRAL}/>
      {championId === 'GUN_GUY' && <circle cx={cx} cy={cy} r={r*0.3} fill={UI_STROKE_PRIMARY} stroke="none"/>}
      {gfx}
    </svg>
  );
};


const ChampionSelectScreen: React.FC<ChampionSelectScreenProps> = ({ champions, onSelectChampion, onGoBack }) => {
  const baseTextStyle: React.CSSProperties = { fontFamily: "'Inter', sans-serif" };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50 p-3 sm:p-4 overflow-y-auto" style={{backgroundColor: UI_BACKGROUND_NEUTRAL, color: UI_STROKE_PRIMARY}}>
      <h1 className="w-full text-3xl sm:text-5xl lg:text-6xl tracking-wide text-center mb-4 sm:mb-6 uppercase" 
        style={{ ...baseTextStyle, fontWeight: '700', WebkitTextStroke: `1px ${UI_STROKE_PRIMARY}`, textShadow: `2px 2px 0px ${UI_STROKE_SECONDARY}33` }}>
        SELECT CORE PROGRAM
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 max-w-sm sm:max-w-xl md:max-w-4xl lg:max-w-6xl w-full mb-4 sm:mb-6">
        {champions.map((champion) => (
          <button
            key={champion.id}
            onClick={() => onSelectChampion(champion.id)}
            className="p-3 sm:p-4 rounded-lg shadow-md transition-all duration-150 flex flex-col justify-between items-center text-center hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{
                backgroundColor: UI_BACKGROUND_NEUTRAL, 
                border: `1.5px solid ${UI_STROKE_SECONDARY}`,
                color: UI_STROKE_PRIMARY,
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = UI_STROKE_PRIMARY}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = UI_STROKE_SECONDARY}
            aria-label={`Select ${champion.name}: ${champion.description}`}
          >
            <ChampionGFXPreview championId={champion.id} />
            <h2 className="text-lg sm:text-xl mb-1 sm:mb-1.5" style={{...baseTextStyle, fontWeight: '600'}}>{champion.name}</h2>
            <p className="text-xs sm:text-sm mb-2 sm:mb-2.5 flex-grow min-h-[3em]" style={{...baseTextStyle, fontWeight: '300', color: UI_STROKE_SECONDARY}}>{champion.description}</p>
            {champion.statsPreview && <p className="text-[11px] sm:text-xs px-2 py-1 rounded-sm" style={{...baseTextStyle, fontWeight: '500', backgroundColor: `${UI_STROKE_SECONDARY}20`, color: UI_STROKE_PRIMARY}}>{champion.statsPreview}</p>}
          </button>
        ))}
      </div>

      <p className="text-xs sm:text-sm text-center mb-4 sm:mb-6" style={{...baseTextStyle, fontWeight: '300', color: UI_STROKE_SECONDARY}}>Initial configuration defines primary operational parameters.</p>
      
      <button
        onClick={onGoBack}
        className="btn-minimal py-2 px-6 text-lg max-w-xs w-full"
        aria-label="Go back to main menu"
      >
        BACK
      </button>
    </div>
  );
};

export default ChampionSelectScreen;