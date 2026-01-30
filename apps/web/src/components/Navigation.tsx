'use client';

import { useState, useEffect, useTransition } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import Image from "next/image";
import { Link, usePathname, useRouter } from '@/i18n/routing';
import { Menu, X, Globe } from "lucide-react";
import { useTranslations, useLocale } from 'next-intl';

export function Navigation() {
    const t = useTranslations('Navigation');
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const [isScrolled, setIsScrolled] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 50);
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const onSelectChange = (nextLocale: string) => {
        startTransition(() => {
            router.replace(pathname, { locale: nextLocale });
            setIsLangMenuOpen(false);
            setIsMobileMenuOpen(false);
        });
    };

    return (
        <nav
            className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${isScrolled
                ? "bg-black/90 backdrop-blur-xl py-3 border-b border-white/5"
                : "bg-transparent py-3"
                }`}
        >
            {/* Full-width container with edge-to-edge content */}
            <div className="w-full px-6 md:px-12 flex items-center justify-between">
                {/* Logo - pushed to left edge */}
                <Link href="/" className="relative w-28 md:w-32 h-8 block transition-transform hover:scale-105">
                    <Image
                        src="/logo_transparent.png"
                        alt="CORRE Logo"
                        fill
                        className="object-contain object-left"
                        priority
                    />
                </Link>

                {/* Desktop Nav - pushed to right edge */}
                <div className="hidden lg:flex items-center gap-12">
                    <div className="flex items-center gap-8">
                        <a href="#features" className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors">{t('features')}</a>
                        <a href="#pricing" className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors">{t('plans')}</a>
                        <a href="#download" className="text-xs font-bold uppercase tracking-widest text-white/70 hover:text-white transition-colors">{t('app')}</a>
                    </div>

                    <div className="flex items-center gap-6 pl-8 border-l border-white/10">
                        {/* Language Switcher */}
                        <div className="relative">
                            <button
                                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white hover:text-[#FF5722] transition-colors"
                            >
                                <Globe size={14} />
                                {locale.toUpperCase()}
                            </button>

                            {isLangMenuOpen && (
                                <div className="absolute top-full right-0 mt-2 bg-black border border-white/10 rounded-md py-2 w-24 flex flex-col gap-1">
                                    {['en', 'pt', 'es'].map((cur) => (
                                        <button
                                            key={cur}
                                            onClick={() => onSelectChange(cur)}
                                            className={`text-xs font-bold uppercase tracking-widest px-4 py-2 text-left hover:bg-white/10 ${locale === cur ? 'text-[#FF5722]' : 'text-white'}`}
                                        >
                                            {cur}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <a href="/login" className="text-xs font-bold uppercase tracking-widest text-white hover:text-[#FF5722] transition-colors">
                            {t('login')}
                        </a>
                    </div>
                </div>

                {/* Mobile Menu Button */}
                {/* Mobile Menu Button - Only visible when menu is CLOSED. The menu itself has its own close button. */}
                {!isMobileMenuOpen && (
                    <button
                        className="lg:hidden p-2 text-white relative z-50"
                        onClick={() => setIsMobileMenuOpen(true)}
                    >
                        <Menu size={24} />
                    </button>
                )}
            </div>

            {/* Mobile Menu - Portalled to body to escape stacking contexts */}
            {isMobileMenuOpen && mounted && createPortal(
                <MobileMenu
                    t={t}
                    locale={locale}
                    onClose={() => setIsMobileMenuOpen(false)}
                    onSelectChange={onSelectChange}
                />,
                document.body
            )}
        </nav>
    );
}

// Extracted Mobile Menu Component for cleaner logic (scroll lock etc)
function MobileMenu({ t, locale, onClose, onSelectChange }: { t: any, locale: string, onClose: () => void, onSelectChange: (l: string) => void }) {
    // Lock body scroll when menu is open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 bg-black/80 backdrop-blur-2xl z-[100] flex flex-col justify-center items-center px-8 supports-[backdrop-filter]:bg-black/60"
        >
            <button
                onClick={onClose}
                className="absolute top-6 right-6 p-2 text-white/50 hover:text-white transition-colors z-50"
            >
                <X size={32} />
            </button>

            {/* Menu Logo */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="absolute top-8 left-8"
            >
                <div className="relative w-32 h-8">
                    <Image
                        src="/logo_transparent.png"
                        alt="CORRE Logo"
                        fill
                        className="object-contain object-left"
                    />
                </div>
            </motion.div>

            <div className="flex flex-col gap-8 items-center text-center">
                {[
                    { href: "#features", label: t('features') },
                    { href: "#pricing", label: t('plans') },
                    { href: "#download", label: t('app') },
                ].map((item, i) => (
                    <motion.a
                        key={item.href}
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.1 + (i * 0.1), duration: 0.3 }}
                        href={item.href}
                        onClick={onClose}
                        className="text-3xl font-bold uppercase tracking-widest text-white hover:text-[#FF5722] transition-colors"
                    >
                        {item.label}
                    </motion.a>
                ))}

                <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: 0.4, duration: 0.4 }}
                    className="h-px w-16 bg-white/20 my-2"
                />

                <motion.a
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.3 }}
                    href="/login"
                    onClick={onClose}
                    className="text-xl font-bold uppercase tracking-widest text-[#FF5722] border border-[#FF5722]/50 px-8 py-3 rounded-full hover:bg-[#FF5722] hover:text-white transition-all"
                >
                    {t('login')}
                </motion.a>
            </div>

            {/* Footer / Lang */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
                className="absolute bottom-12 flex gap-8"
            >
                {['en', 'pt', 'es'].map((cur) => (
                    <button
                        key={cur}
                        onClick={() => onSelectChange(cur)}
                        className={`text-xs font-bold uppercase tracking-[0.2em] transition-colors ${locale === cur ? 'text-[#FF5722]' : 'text-white/40 hover:text-white'}`}
                    >
                        {cur}
                    </button>
                ))}
            </motion.div>
        </motion.div>
    );
}

