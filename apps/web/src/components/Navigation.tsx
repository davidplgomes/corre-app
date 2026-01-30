'use client';

import { useState, useEffect, useTransition } from "react";
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

    useEffect(() => {
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
                <button
                    className="lg:hidden p-2 text-white"
                    onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                >
                    {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="lg:hidden fixed inset-0 bg-black z-40 pt-24 px-6"
                >
                    <div className="flex flex-col gap-8 text-2xl font-black uppercase italic">
                        <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-white">{t('features')}</a>
                        <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-white">{t('plans')}</a>
                        <a href="#download" onClick={() => setIsMobileMenuOpen(false)} className="text-white">{t('app')}</a>

                        <div className="flex gap-4 text-sm font-bold not-italic">
                            {['en', 'pt', 'es'].map((cur) => (
                                <button
                                    key={cur}
                                    onClick={() => onSelectChange(cur)}
                                    className={`uppercase padding-2 ${locale === cur ? 'text-[#FF5722]' : 'text-white/60'}`}
                                >
                                    {cur}
                                </button>
                            ))}
                        </div>

                        <div className="h-px bg-white/10 my-2" />
                        <a href="/login" className="text-[#FF5722]" onClick={() => setIsMobileMenuOpen(false)}>{t('login')}</a>
                    </div>
                </motion.div>
            )}
        </nav>
    );
}
