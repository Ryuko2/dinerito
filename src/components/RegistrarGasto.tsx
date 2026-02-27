/**
 * Registrar Gasto — Multi-step expense form with Anime.js animations.
 * Steps: Date → Description → Who paid → Category → Payment method → Payment type → Amount
 */
import {
  animate,
  createScope,
  createDraggable,
  createAnimatable,
  stagger,
  random,
} from 'animejs';
import { useEffect, useRef, useState } from 'react';
import { Person, CARDS, PaymentType } from '@/lib/types';
import sheriffBoy from '@/assets/sheriff-boy.png';
import sheriffGirl from '@/assets/sheriff-girl.png';

const STEP_NAMES = [
  'Fecha',
  'Descripción',
  '¿Quién pagó?',
  'Categoría',
  'Método de pago',
  'Tipo de pago',
];

const CATEGORY_CHIPS = [
  { value: 'Comida', emoji: '🍖' },
  { value: 'Transporte', emoji: '🐎' },
  { value: 'Hogar', emoji: '🏚️' },
  { value: 'Ropa', emoji: '🛒' },
  { value: 'Salud', emoji: '🌵' },
  { value: 'Entretenimiento', emoji: '🎸' },
  { value: 'Educacion', emoji: '📜' },
  { value: 'Regalos', emoji: '🎁' },
  { value: 'Suscripciones', emoji: '🔄' },
  { value: 'Otro', emoji: '⭐' },
];

const BANK_LOGOS: Record<string, string> = {
  efectivo: '💵',
  santander: 'https://cdn.simpleicons.org/santander/A31D2A',
  bbva: 'https://cdn.simpleicons.org/bbva/004481',
  amex: 'https://cdn.simpleicons.org/americanexpress/2E77BC',
  banamex: 'https://cdn.simpleicons.org/visa/1A1F71',
  banorte: 'https://cdn.simpleicons.org/mastercard/EB001B',
  transferencia: '🔄',
};

interface Props {
  onExpenseAdded: (item: {
    date: string;
    description: string;
    paidBy: Person;
    thirdPartyName?: string;
    category: string;
    card: string;
    brand: string;
    paymentType?: PaymentType;
    amount: number;
  }) => Promise<unknown>;
  onNavigateToLedger: () => void;
}

const prefersReduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export default function RegistrarGasto({ onExpenseAdded, onNavigateToLedger }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const scope = useRef<ReturnType<typeof createScope> | null>(null);

  const [currentStep, setCurrentStep] = useState(0);
  const [showBasket, setShowBasket] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDescription, setSelectedDescription] = useState('');
  const [selectedPaidBy, setSelectedPaidBy] = useState<'kevin' | 'angeles' | 'otro' | null>(null);
  const [otroName, setOtroName] = useState('');
  const [showOtroInput, setShowOtroInput] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentType | null>(null);
  const [amount, setAmount] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const basketRef = useRef<HTMLDivElement>(null);

  // Scope and animations
  useEffect(() => {
    if (!root.current) return;

    scope.current = createScope({ root: root.current }).add((self) => {
      self.add('animateSuccess', () => {
        if (prefersReduced()) return;
        const chips = root.current?.querySelectorAll('.basket-chip-confirmed');
        if (chips?.length) {
          animate(chips, {
            x: () => random(-150, 150),
            y: () => random(-250, -60),
            opacity: [1, 0],
            rotate: () => random(-200, 200),
            scale: [1, 0.5],
            duration: () => random(400, 800),
            ease: 'outExpo',
            delay: stagger(35),
          });
        }
      });
    });

    return () => {
      scope.current?.revert();
      scope.current = null;
    };
  }, []);

  // Step-specific setup (draggables, entrance animations)
  useEffect(() => {
    if (!root.current) return;

    // Re-create scope if missing (handles React strict mode double-invoke)
    if (!scope.current) {
      scope.current = createScope({ root: root.current }).add((self) => {
        self.add('animateSuccess', () => {
          if (prefersReduced()) return;
          const chips = root.current?.querySelectorAll('.basket-chip-confirmed');
          if (chips?.length) {
            animate(chips, {
              x: () => random(-150, 150),
              y: () => random(-250, -60),
              opacity: [1, 0],
              rotate: () => random(-200, 200),
              scale: [1, 0.5],
              duration: () => random(400, 800),
              ease: 'outExpo',
              delay: stagger(35),
            });
          }
        });
      });
    }

    if (prefersReduced()) return;

    const rootEl = root.current;

    if (currentStep === 0 && !showBasket) {
      const dateStep = rootEl.querySelector('.date-step');
      if (dateStep) {
        animate(dateStep, {
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 600,
          ease: 'outExpo',
        });
      }
    }

    if (currentStep === 1 && stepsContainerRef.current) {
      const descStep = rootEl.querySelector('.description-step');
      if (descStep) {
        animate(descStep, {
          opacity: [0, 1],
          translateY: [30, 0],
          duration: 600,
          ease: 'outExpo',
        });
      }
    }

    if (currentStep === 2) {
      const chips = rootEl.querySelectorAll('.draggable-chip');
      if (chips.length) {
        animate(chips, {
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.8, 1],
          delay: stagger(80),
          duration: 400,
          ease: 'outBack(1.5)',
        });

        chips.forEach((chip) => {
          const anim = createAnimatable(chip, { x: 300, y: 300, ease: 'out(3)' });
          chip.addEventListener('mousemove', (e: Event) => {
            const ev = e as MouseEvent;
            const rect = (chip as HTMLElement).getBoundingClientRect();
            const dx = Math.max(-8, Math.min(8, ev.clientX - rect.left - rect.width / 2));
            const dy = Math.max(-8, Math.min(8, ev.clientY - rect.top - rect.height / 2));
            anim.x(dx);
            anim.y(dy);
          });
          chip.addEventListener('mouseleave', () => {
            anim.x(0);
            anim.y(0);
          });
        });

        const draggables = createDraggable('.draggable-chip', {
          dragThreshold: { mouse: 3, touch: 7 },
          releaseEase: 'outElastic(1, .5)',
          releaseStiffness: 80,
          releaseDamping: 12,
          onGrab: (d) => {
            if (prefersReduced()) return;
            animate(d.target, {
              scale: 1.12,
              rotate: random(-3, 3),
              boxShadow: '0 10px 30px rgba(92,58,30,0.35)',
              duration: 200,
              ease: 'outQuad',
            });
          },
          onDrag: (d) => {
            const basket = basketRef.current;
            if (!basket) return;
            const br = basket.getBoundingClientRect();
            const cr = d.target.getBoundingClientRect();
            const near =
              cr.left < br.right + 40 &&
              cr.right > br.left - 40 &&
              cr.top < br.bottom + 40 &&
              cr.bottom > br.top - 40;
            basket.classList.toggle('is-drag-over', near);
          },
          onRelease: (d) => {
            basketRef.current?.classList.remove('is-drag-over');
            const basket = basketRef.current;
            if (!basket) return;
            const br = basket.getBoundingClientRect();
            const cr = d.target.getBoundingClientRect();
            const over =
              cr.left < br.right && cr.right > br.left && cr.top < br.bottom && cr.bottom > br.top;

            if (over) {
              const val = (d.target as HTMLElement).dataset.value;
              if (prefersReduced()) {
                handleChipDropped(val || null);
                return;
              }
              animate(basket, {
                scale: [1, 1.05, 1],
                duration: 400,
                ease: 'outElastic(1, .8)',
              });
              const cx = br.left + br.width / 2;
              const cy = br.top + br.height / 2;
              animate(d.target, {
                x: cx - cr.left - cr.width / 2,
                y: cy - cr.top - cr.height / 2,
                scale: [1.1, 0.6],
                opacity: [1, 0],
                duration: 400,
                ease: 'inOutExpo',
                onComplete: () => handleChipDropped(val || null),
              });
              if (val === 'otro') setShowOtroInput(true);
            } else if (!prefersReduced()) {
              animate(d.target, {
                x: 0,
                y: 0,
                scale: 1,
                rotate: 0,
                boxShadow: '0 3px 0 #8B5E3C',
                duration: 600,
                ease: 'outElastic(1, .5)',
              });
            }
          },
        });
        scope.current.register(draggables);
      }
    }

    if (currentStep === 3) {
      const chips = rootEl.querySelectorAll('.category-chip');
      if (chips.length && !prefersReduced()) {
        animate(chips, {
          opacity: [0, 1],
          translateY: [24, 0],
          scale: [0.8, 1],
          delay: stagger(80),
          duration: 400,
          ease: 'outBack(1.5)',
        });
      }
      const draggables = createDraggable('.category-chip', {
        dragThreshold: { mouse: 3, touch: 7 },
        releaseEase: 'outElastic(1, .5)',
        onDrag: () => {
          const basket = basketRef.current;
          if (!basket) return;
          const chips = rootEl.querySelectorAll('.category-chip');
          const anyNear = Array.from(chips).some((chip) => {
            const br = basket.getBoundingClientRect();
            const cr = chip.getBoundingClientRect();
            return cr.left < br.right + 40 && cr.right > br.left - 40 && cr.top < br.bottom + 40 && cr.bottom > br.top - 40;
          });
          basket.classList.toggle('is-drag-over', anyNear);
        },
        onGrab: (d) => {
          if (!prefersReduced()) animate(d.target, { scale: 1.1, duration: 200, ease: 'outQuad' });
        },
        onRelease: (d) => {
          basketRef.current?.classList.remove('is-drag-over');
          const basket = basketRef.current;
          if (!basket) return;
          const br = basket.getBoundingClientRect();
          const cr = d.target.getBoundingClientRect();
          const over =
            cr.left < br.right && cr.right > br.left && cr.top < br.bottom && cr.bottom > br.top;
          if (over) {
            const val = (d.target as HTMLElement).dataset.value;
            if (!prefersReduced()) {
              animate(basket, { scale: [1, 1.05, 1], duration: 400, ease: 'outElastic(1, .8)' });
              animate(d.target, {
                x: br.left + br.width / 2 - cr.left - cr.width / 2,
                y: br.top + br.height / 2 - cr.top - cr.height / 2,
                scale: [1.1, 0.6],
                opacity: [1, 0],
                duration: 400,
                ease: 'inOutExpo',
                onComplete: () => handleCategoryDropped(val || null),
              });
            } else handleCategoryDropped(val || null);
          } else if (!prefersReduced()) {
            animate(d.target, { x: 0, y: 0, scale: 1, duration: 500, ease: 'outElastic(1, .5)' });
          }
        },
      });
      scope.current.register(draggables);
    }

    if (currentStep === 4) {
      const chips = rootEl.querySelectorAll('.bank-chip');
      if (chips.length && !prefersReduced()) {
        animate(chips, {
          opacity: [0, 1],
          translateX: [-30, 0],
          delay: stagger(70),
          duration: 350,
          ease: 'outExpo',
        });
      }
      const draggables = createDraggable('.bank-chip', {
        dragThreshold: { mouse: 3, touch: 7 },
        releaseEase: 'outElastic(1, .5)',
        onDrag: () => {
          const basket = basketRef.current;
          if (!basket) return;
          const chips = rootEl.querySelectorAll('.bank-chip');
          const anyNear = Array.from(chips).some((chip) => {
            const br = basket.getBoundingClientRect();
            const cr = chip.getBoundingClientRect();
            return cr.left < br.right + 40 && cr.right > br.left - 40 && cr.top < br.bottom + 40 && cr.bottom > br.top - 40;
          });
          basket.classList.toggle('is-drag-over', anyNear);
        },
        onRelease: (d) => {
          basketRef.current?.classList.remove('is-drag-over');
          const basket = basketRef.current;
          if (!basket) return;
          const br = basket.getBoundingClientRect();
          const cr = d.target.getBoundingClientRect();
          const over =
            cr.left < br.right && cr.right > br.left && cr.top < br.bottom && cr.bottom > br.top;
          if (over) {
            const val = (d.target as HTMLElement).dataset.value;
            if (!prefersReduced()) {
              animate(basket, { scale: [1, 1.05, 1], duration: 400, ease: 'outElastic(1, .8)' });
              animate(d.target, {
                x: br.left + br.width / 2 - cr.left - cr.width / 2,
                y: br.top + br.height / 2 - cr.top - cr.height / 2,
                scale: [1.1, 0.6],
                opacity: [1, 0],
                duration: 400,
                ease: 'inOutExpo',
                onComplete: () => handleBankDropped(val || null),
              });
            } else handleBankDropped(val || null);
          } else if (!prefersReduced()) {
            animate(d.target, { x: 0, y: 0, scale: 1, duration: 500, ease: 'outElastic(1, .5)' });
          }
        },
      });
      scope.current.register(draggables);
    }

    if (currentStep === 5) {
      const chips = rootEl.querySelectorAll('.payment-type-chip');
      if (chips.length && !prefersReduced()) {
        animate(chips, {
          opacity: [0, 1],
          translateY: [20, 0],
          delay: stagger(60),
          duration: 350,
          ease: 'outExpo',
        });
      }
      const draggables = createDraggable('.payment-type-chip', {
        dragThreshold: { mouse: 3, touch: 7 },
        releaseEase: 'outElastic(1, .5)',
        onDrag: () => {
          const basket = basketRef.current;
          if (!basket) return;
          const chips = rootEl.querySelectorAll('.payment-type-chip');
          const anyNear = Array.from(chips).some((chip) => {
            const br = basket.getBoundingClientRect();
            const cr = chip.getBoundingClientRect();
            return cr.left < br.right + 40 && cr.right > br.left - 40 && cr.top < br.bottom + 40 && cr.bottom > br.top - 40;
          });
          basket.classList.toggle('is-drag-over', anyNear);
        },
        onRelease: (d) => {
          basketRef.current?.classList.remove('is-drag-over');
          const basket = basketRef.current;
          if (!basket) return;
          const br = basket.getBoundingClientRect();
          const cr = d.target.getBoundingClientRect();
          const over =
            cr.left < br.right && cr.right > br.left && cr.top < br.bottom && cr.bottom > br.top;
          if (over) {
            const val = (d.target as HTMLElement).dataset.value as 'credito' | 'debito';
            if (!prefersReduced()) {
              animate(basket, {
                borderColor: ['#C87941', '#7A9E7E', '#C87941'],
                duration: 600,
                ease: 'inOutSine',
              });
              animate(d.target, {
                x: br.left + br.width / 2 - cr.left - cr.width / 2,
                y: br.top + br.height / 2 - cr.top - cr.height / 2,
                scale: [1.1, 0.6],
                opacity: [1, 0],
                duration: 400,
                ease: 'inOutExpo',
                onComplete: () => handlePaymentTypeDropped(val),
              });
            } else handlePaymentTypeDropped(val);
          } else if (!prefersReduced()) {
            animate(d.target, { x: 0, y: 0, scale: 1, duration: 500, ease: 'outElastic(1, .5)' });
          }
        },
      });
      scope.current.register(draggables);
    }
  }, [currentStep, showBasket]);

  const handleDateConfirm = () => {
    if (!selectedDate) return;
    setShowBasket(true);
    setCurrentStep(1);
    if (!prefersReduced() && basketRef.current) {
      animate(basketRef.current.querySelector('.basket-chip-date'), {
        scale: [0, 1.15, 1],
        opacity: [0, 1],
        duration: 500,
        ease: 'outElastic(1, .6)',
      });
    }
  };

  const handleDescriptionConfirm = () => {
    if (!selectedDescription.trim()) return;
    setCurrentStep(2);
    if (!prefersReduced() && basketRef.current) {
      animate(basketRef.current.querySelector('.basket-chip-desc'), {
        scale: [0, 1.15, 1],
        opacity: [0, 1],
        duration: 500,
        ease: 'outElastic(1, .6)',
      });
    }
  };

  const handleChipDropped = (value: string | null) => {
    if (!value) return;
    if (value === 'otro') {
      setShowOtroInput(true);
      return;
    }
    setSelectedPaidBy(value as 'kevin' | 'angeles');
    setShowOtroInput(false);
    setCurrentStep(3);
  };

  const handleOtroConfirm = () => {
    if (!otroName.trim()) return;
    setSelectedPaidBy('otro');
    setShowOtroInput(false);
    setCurrentStep(3);
  };

  const handleCategoryDropped = (value: string | null) => {
    if (!value) return;
    setSelectedCategory(value);
    setCurrentStep(4);
  };

  const handleBankDropped = (value: string | null) => {
    if (!value) return;
    setSelectedPaymentMethod(value);
    setCurrentStep(5);
  };

  const handlePaymentTypeDropped = (value: 'credito' | 'debito') => {
    setSelectedPaymentType(value);
  };

  const handleSave = async () => {
    const amt = parseFloat(amount);
    if (!amount || amt <= 0) return;

    const paidBy: Person =
      selectedPaidBy === 'kevin'
        ? 'boyfriend'
        : selectedPaidBy === 'angeles'
          ? 'girlfriend'
          : 'boyfriend';
    const thirdPartyName =
      selectedPaidBy === 'otro' && otroName.trim() ? otroName.trim() : undefined;

    const data = {
      date: selectedDate,
      description: selectedDescription,
      paidBy,
      thirdPartyName: thirdPartyName || undefined,
      category: selectedCategory || 'Otro',
      card: selectedPaymentMethod || 'efectivo',
      brand: '',
      paymentType: selectedPaymentType || undefined,
      amount: amt,
    };

    try {
      setIsSaving(true);
      await onExpenseAdded(data);

      if (!prefersReduced() && scope.current) {
        (scope.current as { methods?: { animateSuccess?: () => void } }).methods?.animateSuccess?.();
      }

      setShowSuccess(true);

      if (!prefersReduced()) {
        const successEl = root.current?.querySelector('.success-message');
        if (successEl) {
          animate(successEl, {
            scale: [0, 1.1, 1],
            opacity: [0, 1],
            duration: 600,
            ease: 'outElastic(1, .5)',
            delay: 300,
          });
        }
      }

      setTimeout(() => {
        onNavigateToLedger();
      }, 2200);
    } catch (err) {
      console.error('Error saving expense:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (showSuccess) {
    return (
      <div ref={root} className="registrar-gasto-root min-h-[50vh] flex flex-col items-center justify-center">
        <div className="basket-confirmed-chips" aria-hidden />
        <div
          className="success-message flex flex-col items-center gap-3 text-center px-6"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          <div className="text-5xl text-sage-green">✓</div>
          <h2 className="text-2xl font-bold text-copper">¡Gasto registrado, partner!</h2>
          <p className="text-bone-white/80">Duly recorded in the ledger 🤠</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={root} className="registrar-gasto-root">
      {/* Progress dots */}
      <div className="progress-dots flex gap-2 justify-center py-4 pb-2">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className={`progress-dot w-2.5 h-2.5 rounded-full transition-colors ${
              i < currentStep || (i === 5 && selectedPaymentType) ? 'bg-copper' : 'bg-[#C9B48A]'
            }`}
          />
        ))}
      </div>
      <p className="step-label text-center text-xs text-copper/80 mb-4">
        Paso {Math.min(currentStep + 1, 6)} de 6 — {STEP_NAMES[Math.min(currentStep, 5)]}
      </p>

      {/* Steps container */}
      <div ref={stepsContainerRef} className="steps-container min-h-[200px]">
        {/* Step 0 — Date */}
        {currentStep === 0 && !showBasket && (
          <div className="date-step flex flex-col gap-4 p-4">
            <h2 className="text-xl font-serif text-copper" style={{ fontFamily: "'Playfair Display', serif" }}>
              ¿Cuándo fue el gasto?
            </h2>
            <input
              type="date"
              className="date-input w-full p-4 rounded-xl border-2 border-copper/40 bg-[#F5ECD7] text-copper font-mono"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
            <button
              className="btn-continuar w-full py-4 rounded-xl bg-copper text-[#F5ECD7] font-bold text-lg disabled:opacity-50"
              onClick={handleDateConfirm}
              disabled={!selectedDate}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 1 — Description */}
        {currentStep === 1 && (
          <div className="description-step flex flex-col gap-4 p-4">
            <h2 className="text-xl font-serif text-copper" style={{ fontFamily: "'Playfair Display', serif" }}>
              ¿Qué fue el gasto?
            </h2>
            <input
              type="text"
              className="w-full p-4 rounded-xl border-2 border-copper/40 bg-[#F5ECD7] text-copper placeholder:text-copper/50"
              placeholder="Ej: Comida en el mercado"
              value={selectedDescription}
              onChange={(e) => setSelectedDescription(e.target.value)}
              maxLength={200}
            />
            <button
              className="btn-continuar w-full py-4 rounded-xl bg-copper text-[#F5ECD7] font-bold text-lg disabled:opacity-50"
              onClick={handleDescriptionConfirm}
              disabled={!selectedDescription.trim()}
            >
              Continuar →
            </button>
          </div>
        )}

        {/* Step 2 — Who paid */}
        {currentStep === 2 && (
          <div className="who-step p-4 flex flex-col gap-4">
            <h2 className="text-xl font-serif text-copper" style={{ fontFamily: "'Playfair Display', serif" }}>
              ¿Quién pagó?
            </h2>
            <div className="flex flex-wrap gap-3">
              <div
                className="draggable-chip flex items-center gap-2.5 px-5 py-3.5 rounded-xl border-2 border-copper bg-[#F5ECD7] font-serif text-base cursor-grab active:cursor-grabbing select-none min-h-[52px] min-w-[100px] shadow-[0_3px_0_#8B5E3C]"
                data-value="kevin"
                style={{ touchAction: 'none' }}
              >
                <img src={sheriffBoy} alt="" className="w-8 h-8 rounded-full" />
                <span>KEVIN</span>
              </div>
              <div
                className="draggable-chip flex items-center gap-2.5 px-5 py-3.5 rounded-xl border-2 border-copper bg-[#F5ECD7] font-serif text-base cursor-grab active:cursor-grabbing select-none min-h-[52px] min-w-[100px] shadow-[0_3px_0_#8B5E3C]"
                data-value="angeles"
                style={{ touchAction: 'none' }}
              >
                <img src={sheriffGirl} alt="" className="w-8 h-8 rounded-full" />
                <span>ANGELES</span>
              </div>
              <div
                className="draggable-chip flex items-center gap-2.5 px-5 py-3.5 rounded-xl border-2 border-copper bg-[#F5ECD7] font-serif text-base cursor-grab active:cursor-grabbing select-none min-h-[52px] min-w-[100px] shadow-[0_3px_0_#8B5E3C]"
                data-value="otro"
                style={{ touchAction: 'none' }}
              >
                <span>👤</span>
                <span>OTRO</span>
              </div>
            </div>
            {showOtroInput && (
              <div className="otro-name-input-wrapper flex gap-2">
                <input
                  type="text"
                  placeholder="Nombre"
                  value={otroName}
                  onChange={(e) => setOtroName(e.target.value)}
                  className="flex-1 p-3 rounded-xl border-2 border-copper/40 bg-[#F5ECD7]"
                />
                <button
                  className="px-4 py-3 rounded-xl bg-copper text-[#F5ECD7] font-bold"
                  onClick={handleOtroConfirm}
                  disabled={!otroName.trim()}
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 3 — Category */}
        {currentStep === 3 && (
          <div className="category-step p-4">
            <h2 className="text-xl font-serif text-copper mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Categoría
            </h2>
            <div className="category-chips-container flex flex-wrap gap-2">
              {CATEGORY_CHIPS.map((c) => (
                <div
                  key={c.value}
                  className="category-chip inline-flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-copper/40 bg-[#F5ECD7] font-serif cursor-grab active:cursor-grabbing select-none min-h-[52px] shadow-[0_2px_0_#8B5E3C]"
                  data-value={c.value}
                  style={{ touchAction: 'none' }}
                >
                  <span>{c.emoji}</span>
                  <span>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 4 — Payment method */}
        {currentStep === 4 && (
          <div className="bank-step p-4">
            <h2 className="text-xl font-serif text-copper mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tarjeta / Banco
            </h2>
            <div className="flex flex-wrap gap-2">
              {CARDS.map((c) => (
                <div
                  key={c.value}
                  className="bank-chip flex items-center gap-2.5 px-4 py-3 rounded-xl border border-copper bg-gradient-to-br from-[#2C1A0E] to-[#5C3A1E] text-[#F5ECD7] min-h-[52px] cursor-grab active:cursor-grabbing select-none"
                  data-value={c.value}
                  style={{ touchAction: 'none' }}
                >
                  {BANK_LOGOS[c.value]?.startsWith('http') ? (
                    <img
                      src={BANK_LOGOS[c.value]}
                      alt=""
                      className="w-7 h-7 object-contain"
                      style={{ filter: 'brightness(10)' }}
                    />
                  ) : (
                    <span>{BANK_LOGOS[c.value] || '💳'}</span>
                  )}
                  <span className="text-sm font-medium">{c.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 5 — Payment type */}
        {currentStep === 5 && !selectedPaymentType && (
          <div className="payment-type-step p-4">
            <h2 className="text-xl font-serif text-copper mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Tipo de pago
            </h2>
            <div className="flex gap-3">
              <div
                className="payment-type-chip flex items-center gap-2 px-5 py-3.5 rounded-xl bg-copper text-[#F5ECD7] font-serif font-bold min-h-[52px] cursor-grab active:cursor-grabbing select-none"
                data-value="credito"
                style={{ touchAction: 'none' }}
              >
                <span>💳</span>
                <span>Crédito</span>
              </div>
              <div
                className="payment-type-chip flex items-center gap-2 px-5 py-3.5 rounded-xl bg-[#8B5E3C] text-[#F5ECD7] font-serif font-bold min-h-[52px] cursor-grab active:cursor-grabbing select-none"
                data-value="debito"
                style={{ touchAction: 'none' }}
              >
                <span>🏧</span>
                <span>Débito</span>
              </div>
            </div>
          </div>
        )}

        {/* Amount input — shows after payment type selected */}
        {currentStep === 5 && selectedPaymentType && (
          <div className="amount-input-section p-4 flex flex-col gap-4">
            <label className="text-copper font-semibold">¿Cuánto fue?</label>
            <div className="amount-input-wrapper flex items-center border-b-2 border-copper/60 pb-2">
              <span className="currency-symbol text-2xl text-copper mr-2">$</span>
              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                placeholder="0.00"
                className="amount-input flex-1 font-mono text-4xl font-medium text-[#2C1A0E] border-none bg-transparent text-right outline-none"
                style={{ fontFamily: "'DM Mono', monospace" }}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <button
              className="btn-registrar w-full py-4 rounded-xl bg-copper text-[#F5ECD7] font-serif text-xl font-bold shadow-[0_4px_0_#5C3A1E] active:translate-y-0.5 active:shadow-[0_1px_0_#5C3A1E] disabled:opacity-50 transition-transform"
              style={{ fontFamily: "'Playfair Display', serif" }}
              onClick={handleSave}
              disabled={!amount || parseFloat(amount) <= 0 || isSaving}
            >
              {isSaving ? 'Archivando...' : 'Registrar Gasto'}
            </button>
          </div>
        )}
      </div>

      {/* Basket — always visible after date */}
      {showBasket && (
        <div
          ref={basketRef}
          className="expense-basket sticky bottom-[88px] mx-4 my-4 p-4 min-h-[100px] rounded-2xl border-2 border-dashed border-copper bg-[#5C3A1E] transition-shadow"
        >
          {!selectedDate && !selectedDescription && !selectedPaidBy && !selectedCategory && !selectedPaymentMethod && !selectedPaymentType ? (
            <p className="basket-empty-label italic text-center text-[15px]" style={{ fontFamily: "'Crimson Pro', serif", color: 'rgba(245, 236, 215, 0.4)' }}>
              Arrastra los datos al cesto
            </p>
          ) : (
            <div className="basket-confirmed-chips flex flex-wrap gap-1">
              {selectedDate && (
                <span className="basket-chip-confirmed basket-chip-date inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  📅 {selectedDate}
                </span>
              )}
              {selectedDescription && (
                <span className="basket-chip-confirmed basket-chip-desc inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {selectedDescription}
                </span>
              )}
              {(selectedPaidBy === 'kevin' || selectedPaidBy === 'angeles') && (
                <span className="basket-chip-confirmed inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {selectedPaidBy === 'kevin' ? '👤 Kevin' : '👤 Angeles'}
                </span>
              )}
              {selectedPaidBy === 'otro' && otroName && (
                <span className="basket-chip-confirmed inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  👤 {otroName}
                </span>
              )}
              {selectedCategory && (
                <span className="basket-chip-confirmed inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {CATEGORY_CHIPS.find((c) => c.value === selectedCategory)?.emoji} {selectedCategory}
                </span>
              )}
              {selectedPaymentMethod && (
                <span className="basket-chip-confirmed inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {CARDS.find((c) => c.value === selectedPaymentMethod)?.label || selectedPaymentMethod}
                </span>
              )}
              {selectedPaymentType && (
                <span className="basket-chip-confirmed inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[13px] text-[#F5ECD7] border border-copper bg-copper/20" style={{ fontFamily: "'Crimson Pro', serif" }}>
                  {selectedPaymentType === 'credito' ? '💳 Crédito' : '🏧 Débito'}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
