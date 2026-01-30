'use client';

import { useState, useEffect } from 'react';
import { Link } from '@/i18n/routing';
import Image from 'next/image';
import {
    ArrowRight, ArrowUpRight, ArrowDown, Activity,
    MapPin, Play, Plus, Zap, Filter, Timer, Heart, Trophy, Sparkles
} from 'lucide-react';
import { Navigation } from '@/components/Navigation';
import DisplayCards from '@/components/ui/display-cards';
import { UpcomingEventsDeck } from '@/components/upcoming-events-deck';
import { useTranslations } from 'next-intl';

export default function Home() {
    const t = useTranslations('HomePage');
    const [scrollOpacity, setScrollOpacity] = useState(1);

    useEffect(() => {
        const handleScroll = () => {
            const scrollY = window.scrollY;
            const fadeStart = 100;
            const fadeEnd = 500;

            if (scrollY <= fadeStart) {
                setScrollOpacity(1);
            } else if (scrollY >= fadeEnd) {
                setScrollOpacity(0);
            } else {
                setScrollOpacity(1 - (scrollY - fadeStart) / (fadeEnd - fadeStart));
            }
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    return (
        <main className="min-h-screen bg-black text-white cursor-crosshair overflow-x-hidden selection:bg-[#FF5722] selection:text-white">

            {/* Background Grid */}
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />

            {/* 1. Header: Technical Minimalist - Replaced by Navigation Component */}
            <Navigation />

            {/* HERO */}
            <section className="relative h-screen min-h-[600px] md:min-h-[700px] max-h-[1000px] overflow-hidden">
                {/* Background with blur */}
                <div className="absolute inset-0">
                    <div className="absolute inset-0 bg-black" /> {/* Fallback black background */}
                    <div className="absolute inset-0 blur-sm scale-105">
                        <Image
                            src="/hero.png"
                            alt=""
                            fill
                            className="object-cover"
                            priority
                            quality={100}
                            unoptimized
                        />
                    </div>
                    {/* Horizontal Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                    {/* Vertical Gradient to fix bottom edge */}
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
                </div>

                {/* Content with scroll fade */}
                <div
                    className="relative h-full flex flex-col justify-between px-6 md:px-16 lg:px-24 py-24 md:py-32 transition-opacity duration-100"
                    style={{ opacity: scrollOpacity }}
                >
                    {/* Top: Tagline */}
                    <p className="text-xs md:text-sm tracking-[0.3em] text-white/60 uppercase">
                        {t('tagline')}
                    </p>

                    {/* Middle: Logo with drop-shadow glow effect */}
                    <div className="flex items-center justify-center md:justify-start">
                        <Image
                            src="/corre_logo.png"
                            alt="CORRE DUBLIN"
                            width={800}
                            height={300}
                            className="w-full h-auto max-w-[320px] md:max-w-[650px] drop-shadow-[0_0_60px_rgba(255,255,255,0.3)] filter bg-transparent"
                            priority
                            unoptimized
                        />
                    </div>

                    {/* Bottom: CTA + Info */}
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                        <a
                            href="#download"
                            className="group inline-flex items-center gap-4 text-white justify-center md:justify-start"
                        >
                            <span className="text-sm tracking-[0.2em] uppercase">{t('downloadApp')}</span>
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-2 transition-transform" />
                        </a>

                        <p className="text-sm text-white/40 max-w-xs text-right hidden md:block whitespace-pre-line">
                            {t('description')}
                        </p>
                    </div>
                </div>
            </section>

            {/* 3. Section 2: "The Culture" (Sticky Split) */}
            <section id="features" className="bg-[#050505] relative w-full border-b border-white/10">
                <div className="flex flex-col lg:flex-row">
                    {/* LEFT PANE: Sticky Visuals */}
                    <div className="w-full lg:w-1/2 h-[50vh] lg:h-screen lg:sticky lg:top-0 relative overflow-hidden border-r border-white/10 group">
                        <Image
                            src="/culture_community.png"
                            alt="Culture"
                            fill
                            className="object-cover opacity-80 grayscale mix-blend-screen transition-all duration-1000 group-hover:scale-105 group-hover:opacity-100"
                        />
                    </div>

                    {/* RIGHT PANE: Scrolling Content */}
                    <div className="w-full lg:w-1/2 flex flex-col min-h-screen">
                        {/* Header Block: The Manifesto */}
                        <div className="p-8 lg:p-24 pb-0 flex flex-col items-start gap-8">
                            <h2 className="text-4xl md:text-5xl lg:text-7xl font-black text-white italic tracking-tighter leading-[0.9] mix-blend-difference break-words w-full">
                                {t('sections.culture.title')}
                            </h2>
                            <div className="w-24 h-2 bg-[#FF5722]" />

                            {/* Subtitles: The 3 Pillars */}
                            <div className="flex flex-col gap-2">
                                <p className="text-lg md:text-2xl font-black text-[#FF5722] leading-tight uppercase tracking-tight">
                                    {t('sections.culture.subtitles')}
                                </p>
                            </div>

                            <p className="text-base md:text-lg text-gray-400 max-w-xl leading-relaxed mt-4">
                                {t.rich('sections.culture.manifesto', {
                                    span_bold: (chunks) => <span className="text-white font-bold">{chunks}</span>
                                })}
                            </p>
                        </div>

                        {/* Scrolling Feed */}
                        <div className="px-8 lg:px-24 lg:pb-24 lg:pt-0 flex flex-col gap-8">



                            {/* Weekly Schedule - Visual Deck */}
                            <div className="flex flex-col gap-6 mt-12 lg:mt-0">
                                <div className="flex items-center gap-4">
                                    <div className="h-px bg-white/20 flex-1" />
                                    <h3 className="text-xs font-mono font-bold text-[#FF5722] tracking-[0.2em] uppercase">{t('sections.culture.events.header')}</h3>
                                </div>

                                <div className="py-2 w-full overflow-hidden">
                                    <UpcomingEventsDeck />
                                </div>
                            </div>



                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Section: Plans / Membership */}
            <section id="pricing" className="py-24 bg-[#050505] border-b border-white/10">
                <div className="max-w-[1400px] mx-auto px-6">
                    <div className="flex flex-col items-center text-center mb-20">
                        <h2 className="text-4xl md:text-6xl lg:text-8xl font-black text-white italic tracking-tighter leading-[0.8] mb-6">
                            {t('sections.plans.title')}
                        </h2>
                        <div className="flex items-center gap-4">
                            <div className="h-px w-12 bg-[#FF5722]" />
                            <span className="text-sm font-mono font-bold text-[#FF5722] tracking-[0.3em]">
                                {t('sections.plans.subtitle')}
                            </span>
                            <div className="h-px w-12 bg-[#FF5722]" />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-6xl mx-auto">

                        {/* Free Plan */}
                        <div className="group relative p-8 rounded-2xl border border-white/10 bg-[#0A0A0A] hover:border-white/20 transition-all duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black italic text-white mb-2">{t('sections.plans.tiers.free.name')}</h3>
                                <div className="text-sm text-gray-500 font-medium min-h-[40px]">{t('sections.plans.tiers.free.description')}</div>
                            </div>
                            <div className="mb-12">
                                <span className="text-4xl font-black text-white tracking-tighter">{t('sections.plans.tiers.free.price')}</span>
                            </div>
                            <ul className="space-y-4 mb-4">
                                <li className="flex items-start gap-3 text-sm text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.free.features.economy')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.free.features.events')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.free.features.marketplace')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-400">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.free.features.coupons')}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Pro Plan */}
                        <div className="group relative p-8 rounded-2xl border border-[#FF5722]/30 bg-[#0F0F0F] hover:border-[#FF5722] hover:shadow-[0_0_30px_-10px_rgba(255,87,34,0.15)] transition-all duration-500 scale-105 z-10">
                            <div className="absolute top-0 right-0 bg-[#FF5722] text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl tracking-widest">POPULAR</div>
                            <div className="mb-8">
                                <h3 className="text-2xl font-black italic text-[#FF5722] mb-2">{t('sections.plans.tiers.pro.name')}</h3>
                                <div className="text-sm text-gray-400 font-medium min-h-[40px]">{t('sections.plans.tiers.pro.description')}</div>
                            </div>
                            <div className="mb-12">
                                <span className="text-5xl font-black text-white tracking-tighter">{t('sections.plans.tiers.pro.price')}</span>
                            </div>
                            <ul className="space-y-4 mb-4">
                                <li className="flex items-start gap-3 text-sm text-white font-bold">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.pro.features.discount')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-white">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.pro.features.economy')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-white">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.pro.features.sales')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-white">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.pro.features.events')}</span>
                                </li>
                            </ul>
                        </div>

                        {/* Club Plan */}
                        <div className="group relative p-8 rounded-2xl border border-white/10 bg-[#0A0A0A] hover:border-white/40 transition-all duration-500">
                            <div className="mb-8">
                                <h3 className="text-2xl font-black italic text-white mb-2">{t('sections.plans.tiers.club.name')}</h3>
                                <div className="text-sm text-gray-500 font-medium min-h-[40px]">{t('sections.plans.tiers.club.description')}</div>
                            </div>
                            <div className="mb-12">
                                <span className="text-4xl font-black text-white tracking-tighter">{t('sections.plans.tiers.club.price')}</span>
                            </div>
                            <ul className="space-y-4 mb-4">
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.club.features.welcome')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.club.features.guest')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.club.features.priority')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.club.features.sales')}</span>
                                </li>
                                <li className="flex items-start gap-3 text-sm text-gray-300">
                                    <div className="w-2 h-2 rounded-full bg-[#22c55e] mt-1.5 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                                    <span>{t('sections.plans.tiers.club.features.profile')}</span>
                                </li>
                            </ul>
                        </div>

                    </div>
                </div>
            </section>

            {/* 4. Section 3: "Community // Motion" */}




            {/* 6. Footer */}
            <footer className="bg-black pt-16 md:pt-32 pb-4 overflow-hidden relative">
                <div className="max-w-[1400px] mx-auto px-6 relative z-10">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12 text-lg md:text-xs font-bold tracking-widest uppercase mb-16 md:mb-32">
                        <ul className="space-y-4">
                            <li className="text-gray-500 mb-4">{t('footer.connect')}</li>
                            <li><a href="#" className="hover:text-[#FF5722]">{t('footer.instagram')}</a></li>
                            <li><a href="#" className="hover:text-[#FF5722]">{t('footer.tiktok')}</a></li>
                            <li><a href="#" className="hover:text-[#FF5722]">{t('footer.strava')}</a></li>
                        </ul>
                        <ul className="space-y-4">
                            <li className="text-gray-500 mb-4">{t('footer.contact')}</li>
                            <li><a href="mailto:hello@corredublin.com" className="hover:text-[#FF5722] normal-case">{t('footer.email')}</a></li>
                        </ul>
                        <ul className="space-y-4">
                            <li className="text-gray-500 mb-4">{t('footer.legal')}</li>
                            <li><a href="#" className="hover:text-[#FF5722]">{t('footer.privacy')}</a></li>
                            <li><a href="#" className="hover:text-[#FF5722]">{t('footer.terms')}</a></li>
                        </ul>
                    </div>

                    <div className="flex justify-between items-end tech-block text-[0.6rem] mb-4 text-gray-600">
                        <div>
                        </div>
                        <div className="text-right">
                            {t('footer.copyright')} <br /> {t('footer.doNotCopy')}
                        </div>
                    </div>
                </div>

                <div className="w-full text-center leading-[0.7] select-none pointer-events-none mix-blend-difference overflow-hidden">
                    <div className="text-[24vw] md:text-[15vw] font-black tracking-tighter whitespace-nowrap px-4">
                        {t('footer.brandName')}
                    </div>
                </div>
            </footer>

        </main>
    );
}
