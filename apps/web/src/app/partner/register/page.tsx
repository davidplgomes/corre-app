'use client';

import { useState, type ChangeEvent } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Loader2, X, Upload } from 'lucide-react';
import { PHONE_COUNTRY_CODES } from '@/lib/phone-country-codes';

type Step = 1 | 2 | 3 | 4;
type LocaleCode = 'en' | 'pt' | 'es';

const CATEGORY_OPTIONS = [
    'Barber Shop',
    'Beauty Salon',
    'Physiotherapy Clinic',
    'Massage',
    'Supplements',
    'Medical Clinic',
    'Dental Practice',
    'Gym',
    'Restaurant',
    'Clothing Shop',
    'Hotel',
    'Travel Agency',
    'Tour Operator',
    'Other',
] as const;

const MEMBERSHIP_OPTIONS = ['Free', 'Monthly', 'Annual'] as const;

const STEP_TITLES: Record<LocaleCode, Record<Step, string>> = {
    en: { 1: 'Business', 2: 'Benefits', 3: 'Contact', 4: 'Review' },
    pt: { 1: 'Negocio', 2: 'Beneficios', 3: 'Contato', 4: 'Revisao' },
    es: { 1: 'Negocio', 2: 'Beneficios', 3: 'Contacto', 4: 'Revision' },
};

const CATEGORY_LABELS: Record<LocaleCode, Record<(typeof CATEGORY_OPTIONS)[number], string>> = {
    en: {
        'Barber Shop': 'Barber Shop',
        'Beauty Salon': 'Beauty Salon',
        'Physiotherapy Clinic': 'Physiotherapy Clinic',
        Massage: 'Massage',
        Supplements: 'Supplements',
        'Medical Clinic': 'Medical Clinic',
        'Dental Practice': 'Dental Practice',
        Gym: 'Gym',
        Restaurant: 'Restaurant',
        'Clothing Shop': 'Clothing Shop',
        Hotel: 'Hotel',
        'Travel Agency': 'Travel Agency',
        'Tour Operator': 'Tour Operator',
        Other: 'Other',
    },
    pt: {
        'Barber Shop': 'Barbearia',
        'Beauty Salon': 'Salao de Beleza',
        'Physiotherapy Clinic': 'Clinica de Fisioterapia',
        Massage: 'Massagem',
        Supplements: 'Suplementos',
        'Medical Clinic': 'Clinica Medica',
        'Dental Practice': 'Clinica Dentaria',
        Gym: 'Ginasio',
        Restaurant: 'Restaurante',
        'Clothing Shop': 'Loja de Roupa',
        Hotel: 'Hotel',
        'Travel Agency': 'Agencia de Viagens',
        'Tour Operator': 'Operador Turistico',
        Other: 'Outro',
    },
    es: {
        'Barber Shop': 'Barberia',
        'Beauty Salon': 'Salon de Belleza',
        'Physiotherapy Clinic': 'Clinica de Fisioterapia',
        Massage: 'Masajes',
        Supplements: 'Suplementos',
        'Medical Clinic': 'Clinica Medica',
        'Dental Practice': 'Clinica Dental',
        Gym: 'Gimnasio',
        Restaurant: 'Restaurante',
        'Clothing Shop': 'Tienda de Ropa',
        Hotel: 'Hotel',
        'Travel Agency': 'Agencia de Viajes',
        'Tour Operator': 'Operador Turistico',
        Other: 'Otro',
    },
};

const MEMBERSHIP_LABELS: Record<LocaleCode, Record<(typeof MEMBERSHIP_OPTIONS)[number], string>> = {
    en: { Free: 'Free', Monthly: 'Monthly', Annual: 'Annual' },
    pt: { Free: 'Gratis', Monthly: 'Mensal', Annual: 'Anual' },
    es: { Free: 'Gratis', Monthly: 'Mensual', Annual: 'Anual' },
};

const FORM_TEXT: Record<
    LocaleCode,
    {
        title: string;
        stepLabel: string;
        ofWord: string;
        success: string;
        submitAnother: string;
        goToLogin: string;
        businessNameRequired: string;
        categoryRequired: string;
        categorySpecifyRequired: string;
        membershipRequired: string;
        clubBenefitsRequired: string;
        staffBenefitsRequired: string;
        pocRequired: string;
        phoneRequired: string;
        instagramRequired: string;
        loginEmailRequired: string;
        uploadError: string;
        submitError: string;
        labels: Record<string, string>;
        placeholders: Record<string, string>;
        buttons: Record<string, string>;
        fileTypes: string;
        uploaded: string;
        selectCategory: string;
        selectMembership: string;
        specifyCategory: string;
        alreadyApproved: string;
        signIn: string;
    }
> = {
    en: {
        title: 'Partnership Application',
        stepLabel: 'Step',
        ofWord: 'of',
        success: 'Application submitted successfully. Our admin team will review it and contact you soon.',
        submitAnother: 'Submit another',
        goToLogin: 'Go to login',
        businessNameRequired: 'Business Name is required.',
        categoryRequired: 'Category is required.',
        categorySpecifyRequired: 'Please specify your category.',
        membershipRequired: 'Membership is required.',
        clubBenefitsRequired: 'Club Benefits is required.',
        staffBenefitsRequired: 'Staff Benefits is required.',
        pocRequired: 'POC is required.',
        phoneRequired: 'Phone Number is required.',
        instagramRequired: 'Instagram is required.',
        loginEmailRequired: 'Login Email is required.',
        uploadError: 'Could not upload logo.',
        submitError: 'Could not submit application.',
        labels: {
            businessName: '1. Business Name',
            category: '8. Category',
            membership: '9. Membership',
            startDate: '10. Start Date',
            logo: '7. Logo',
            clubBenefits: '2. Club Benefits',
            staffBenefits: '3. Staff Benefits',
            poc: '4. POC',
            phone: '5. Phone Number',
            instagram: '6. Instagram',
            loginEmail: 'Login Email',
            businessDescription: 'Business Description',
            websiteUrl: 'Site URL?',
            websiteYes: 'Yes',
            websiteNo: 'No',
            websiteNoMessage: 'This site and mobile app were made by',
            websiteNoMessageEnd: '— get in touch if you need our services!',
            contactEmail: 'Contact Email',
            city: 'City',
            country: 'Country',
            businessAddress: 'Business Address',
            notes: 'Notes for review',
        },
        placeholders: {
            businessName: 'Your business trading name',
            specifyCategory: 'Type your category',
            clubBenefits: 'What are you going to offer to our run members.',
            staffBenefits: 'What are you going to offer to our staff.',
            poc: 'Name of the person responsible for keeping in touch with us.',
            phone: 'Phone number',
            instagram: '@business',
            loginEmail: 'email for partner dashboard access',
            businessDescription: 'Optional extra context about your business',
            websiteUrl: 'yourbusiness.com',
            contactEmail: 'Optional contact email',
            city: 'City',
            country: 'Country',
            businessAddress: 'Street, number...',
            notes: 'Optional notes for admin team',
        },
        buttons: {
            chooseFile: 'Choose file',
            uploading: 'Uploading...',
            continue: 'Continue',
            back: 'Back',
            submitting: 'Submitting...',
            submit: 'Submit Application',
        },
        fileTypes: 'PNG/JPG/WEBP up to 5MB',
        uploaded: 'Uploaded',
        selectCategory: 'Select category',
        selectMembership: 'Select membership',
        specifyCategory: 'Specify Category',
        alreadyApproved: 'Already approved?',
        signIn: 'Sign in',
    },
    pt: {
        title: 'Formulario de Parceria',
        stepLabel: 'Etapa',
        ofWord: 'de',
        success: 'Formulario enviado com sucesso. Nossa equipe vai analisar e entrar em contato.',
        submitAnother: 'Enviar outro',
        goToLogin: 'Ir para login',
        businessNameRequired: 'Nome do negocio e obrigatorio.',
        categoryRequired: 'Categoria e obrigatoria.',
        categorySpecifyRequired: 'Por favor informe sua categoria.',
        membershipRequired: 'Plano de membro e obrigatorio.',
        clubBenefitsRequired: 'Beneficios do clube sao obrigatorios.',
        staffBenefitsRequired: 'Beneficios da equipe sao obrigatorios.',
        pocRequired: 'POC e obrigatorio.',
        phoneRequired: 'Telefone e obrigatorio.',
        instagramRequired: 'Instagram e obrigatorio.',
        loginEmailRequired: 'Email de login e obrigatorio.',
        uploadError: 'Nao foi possivel enviar o logo.',
        submitError: 'Nao foi possivel enviar o formulario.',
        labels: {
            businessName: '1. Nome do Negocio',
            category: '8. Categoria',
            membership: '9. Membro',
            startDate: '10. Data de Inicio',
            logo: '7. Logo',
            clubBenefits: '2. Beneficios do Clube',
            staffBenefits: '3. Beneficios da Equipe',
            poc: '4. POC',
            phone: '5. Numero de Telefone',
            instagram: '6. Instagram',
            loginEmail: 'Email de Login',
            businessDescription: 'Descricao do Negocio',
            websiteUrl: 'Site / URL?',
            websiteYes: 'Sim',
            websiteNo: 'Nao',
            websiteNoMessage: 'Este site e aplicativo foram feitos pela',
            websiteNoMessageEnd: '— entre em contato se precisar dos nossos serviços!',
            contactEmail: 'Email de Contato',
            city: 'Cidade',
            country: 'Pais',
            businessAddress: 'Endereco do Negocio',
            notes: 'Notas para revisao',
        },
        placeholders: {
            businessName: 'Nome comercial do seu negocio',
            specifyCategory: 'Digite sua categoria',
            clubBenefits: 'O que voce vai oferecer para os membros do clube.',
            staffBenefits: 'O que voce vai oferecer para nossa equipe.',
            poc: 'Nome da pessoa responsavel por manter contato conosco.',
            phone: 'Numero de telefone',
            instagram: '@seunegocio',
            loginEmail: 'email para acesso ao painel parceiro',
            businessDescription: 'Contexto extra opcional sobre seu negocio',
            websiteUrl: 'seunegocio.com',
            contactEmail: 'Email de contato opcional',
            city: 'Cidade',
            country: 'Pais',
            businessAddress: 'Rua, numero...',
            notes: 'Notas opcionais para a equipe admin',
        },
        buttons: {
            chooseFile: 'Escolher arquivo',
            uploading: 'Enviando...',
            continue: 'Continuar',
            back: 'Voltar',
            submitting: 'Enviando...',
            submit: 'Enviar formulario',
        },
        fileTypes: 'PNG/JPG/WEBP ate 5MB',
        uploaded: 'Enviado',
        selectCategory: 'Selecionar categoria',
        selectMembership: 'Selecionar membro',
        specifyCategory: 'Especificar categoria',
        alreadyApproved: 'Ja aprovado?',
        signIn: 'Entrar',
    },
    es: {
        title: 'Formulario de Partnership',
        stepLabel: 'Paso',
        ofWord: 'de',
        success: 'Solicitud enviada con exito. Nuestro equipo revisara y te contactara pronto.',
        submitAnother: 'Enviar otra',
        goToLogin: 'Ir a login',
        businessNameRequired: 'Nombre del negocio es obligatorio.',
        categoryRequired: 'Categoria es obligatoria.',
        categorySpecifyRequired: 'Indica tu categoria por favor.',
        membershipRequired: 'Membresia es obligatoria.',
        clubBenefitsRequired: 'Beneficios del club son obligatorios.',
        staffBenefitsRequired: 'Beneficios del staff son obligatorios.',
        pocRequired: 'POC es obligatorio.',
        phoneRequired: 'Telefono es obligatorio.',
        instagramRequired: 'Instagram es obligatorio.',
        loginEmailRequired: 'Email de acceso es obligatorio.',
        uploadError: 'No se pudo subir el logo.',
        submitError: 'No se pudo enviar la solicitud.',
        labels: {
            businessName: '1. Nombre del Negocio',
            category: '8. Categoria',
            membership: '9. Membresia',
            startDate: '10. Fecha de Inicio',
            logo: '7. Logo',
            clubBenefits: '2. Beneficios del Club',
            staffBenefits: '3. Beneficios del Staff',
            poc: '4. POC',
            phone: '5. Numero de Telefono',
            instagram: '6. Instagram',
            loginEmail: 'Email de Login',
            businessDescription: 'Descripcion del Negocio',
            websiteUrl: 'Sitio Web / URL?',
            websiteYes: 'Si',
            websiteNo: 'No',
            websiteNoMessage: 'Este sitio y la app fueron hechos por',
            websiteNoMessageEnd: '— contactanos si necesitas nuestros servicios!',
            contactEmail: 'Email de Contacto',
            city: 'Ciudad',
            country: 'Pais',
            businessAddress: 'Direccion del Negocio',
            notes: 'Notas para revision',
        },
        placeholders: {
            businessName: 'Nombre comercial de tu negocio',
            specifyCategory: 'Escribe tu categoria',
            clubBenefits: 'Que vas a ofrecer a nuestros miembros del club.',
            staffBenefits: 'Que vas a ofrecer a nuestro staff.',
            poc: 'Nombre de la persona responsable de mantener contacto con nosotros.',
            phone: 'Numero de telefono',
            instagram: '@tunegocio',
            loginEmail: 'email para acceso al panel partner',
            businessDescription: 'Contexto opcional de tu negocio',
            websiteUrl: 'tunegocio.com',
            contactEmail: 'Email de contacto opcional',
            city: 'Ciudad',
            country: 'Pais',
            businessAddress: 'Calle, numero...',
            notes: 'Notas opcionales para el equipo admin',
        },
        buttons: {
            chooseFile: 'Elegir archivo',
            uploading: 'Subiendo...',
            continue: 'Continuar',
            back: 'Volver',
            submitting: 'Enviando...',
            submit: 'Enviar solicitud',
        },
        fileTypes: 'PNG/JPG/WEBP hasta 5MB',
        uploaded: 'Subido',
        selectCategory: 'Seleccionar categoria',
        selectMembership: 'Seleccionar membresia',
        specifyCategory: 'Especificar categoria',
        alreadyApproved: 'Ya aprobado?',
        signIn: 'Iniciar sesion',
    },
};

interface PartnerApplicationForm {
    full_name: string;
    email: string;
    phone_country_code: string;
    phone: string;
    business_name: string;
    club_benefits: string;
    staff_benefits: string;
    poc_name: string;
    category: string;
    category_other: string;
    membership: string;
    start_date: string;
    logo_url: string;
    business_description: string;
    contact_email: string;
    website_url: string;
    instagram_handle: string;
    business_address: string;
    city: string;
    country: string;
    notes: string;
}

const INITIAL_FORM: PartnerApplicationForm = {
    full_name: '',
    email: '',
    phone_country_code: '+353',
    phone: '',
    business_name: '',
    club_benefits: '',
    staff_benefits: '',
    poc_name: '',
    category: '',
    category_other: '',
    membership: '',
    start_date: '',
    logo_url: '',
    business_description: '',
    contact_email: '',
    website_url: '',
    instagram_handle: '',
    business_address: '',
    city: '',
    country: '',
    notes: '',
};

function RequiredAsterisk() {
    return <span className="text-red-400 ml-1">*</span>;
}

export default function PartnerRegisterPage() {
    const pathname = usePathname();
    const locale = (pathname.split('/')[1] === 'pt' || pathname.split('/')[1] === 'es' || pathname.split('/')[1] === 'en'
        ? pathname.split('/')[1]
        : 'en') as LocaleCode;
    const copy = FORM_TEXT[locale];
    const stepTitles = STEP_TITLES[locale];

    const [step, setStep] = useState<Step>(1);
    const [loading, setLoading] = useState(false);
    const [logoUploading, setLogoUploading] = useState(false);
    const [logoFileName, setLogoFileName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [form, setForm] = useState<PartnerApplicationForm>(INITIAL_FORM);

    const setField = (field: keyof PartnerApplicationForm, value: string) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleCategoryChange = (value: string) => {
        setForm((prev) => ({
            ...prev,
            category: value,
            category_other: value === 'Other' ? prev.category_other : '',
        }));
    };

    const validateStep = (targetStep: Step): string | null => {
        if (targetStep === 1) {
            if (!form.business_name.trim()) return copy.businessNameRequired;
            if (!form.category.trim()) return copy.categoryRequired;
            if (form.category === 'Other' && !form.category_other.trim()) return copy.categorySpecifyRequired;
            if (!form.membership.trim()) return copy.membershipRequired;
        }
        if (targetStep === 2) {
            if (!form.club_benefits.trim()) return copy.clubBenefitsRequired;
            if (!form.staff_benefits.trim()) return copy.staffBenefitsRequired;
        }
        if (targetStep === 3) {
            if (!form.poc_name.trim()) return copy.pocRequired;
            if (!form.phone.trim()) return copy.phoneRequired;
            if (!form.instagram_handle.trim()) return copy.instagramRequired;
            if (!form.email.trim()) return copy.loginEmailRequired;
        }
        return null;
    };

    const handleNext = () => {
        setError('');
        const message = validateStep(step);
        if (message) {
            setError(message);
            return;
        }
        if (step < 4) {
            setStep((prev) => (prev + 1) as Step);
        }
    };

    const handleBack = () => {
        setError('');
        if (step > 1) {
            setStep((prev) => (prev - 1) as Step);
        }
    };

    const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setError('');
        setLogoUploading(true);
        try {
            const payload = new FormData();
            payload.append('file', file);

            const response = await fetch('/api/partner-applications/logo', {
                method: 'POST',
                body: payload,
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || copy.uploadError);
            }

            setField('logo_url', result.logo_url || '');
            setLogoFileName(file.name);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : copy.uploadError;
            setError(message);
        } finally {
            setLogoUploading(false);
        }
    };

    const submitApplication = async () => {
        setError('');

        const message = validateStep(1) || validateStep(2) || validateStep(3);
        if (message) {
            setError(message);
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...form,
                full_name: form.poc_name.trim(),
                phone: form.phone.trim(),
                instagram_handle: form.instagram_handle.trim(),
                category_other: form.category_other.trim(),
            };

            const response = await fetch('/api/partner-applications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const result = await response.json();
            if (!response.ok) {
                throw new Error(result?.error || copy.submitError);
            }

            setSuccessMessage(copy.success);
            setForm(INITIAL_FORM);
            setStep(1);
            setLogoFileName('');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : copy.submitError;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputCls = 'w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all';
    const selectCls = `${inputCls} appearance-none`;
    const inputStyle = {
        background: 'rgba(255, 255, 255, 0.06)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
    };

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-4 relative overflow-hidden">
            <div className="fixed inset-0 grid-overlay opacity-10 pointer-events-none z-0" />
            <div className="fixed inset-0">
                <div className="absolute inset-0 bg-black" />
                <div className="absolute inset-0 blur-sm scale-105">
                    <Image src="/hero.png" alt="" fill className="object-cover" priority quality={100} unoptimized />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black" />
                <div className="absolute inset-0 bg-black/40" />
            </div>

            <div className="relative w-full max-w-[760px] z-10">
                <div className="absolute -inset-[1px] rounded-3xl bg-gradient-to-b from-white/25 via-white/5 to-white/10 blur-[1px]" />
                <div
                    className="relative rounded-3xl p-8 shadow-2xl shadow-black/40 overflow-hidden"
                    style={{
                        background: 'rgba(20, 20, 22, 0.75)',
                        backdropFilter: 'blur(40px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                    }}
                >
                    <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/[0.05] via-transparent to-transparent pointer-events-none" />

                    <Link
                        href="/login"
                        className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <X className="w-4 h-4 text-white/70" />
                    </Link>

                    <div className="flex items-center gap-2 mb-6">
                        {[1, 2, 3, 4].map((n, index) => {
                            const current = n as Step;
                            const isDone = current < step;
                            const isActive = current === step;
                            return (
                                <div key={n} className="flex items-center flex-1">
                                    <div
                                        className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-[#FF5722] text-white' : 'bg-white/10 text-white/40'
                                            }`}
                                    >
                                        {isDone ? '✓' : n}
                                    </div>
                                    {index < 3 ? (
                                        <div className={`h-px flex-1 mx-2 ${step > current ? 'bg-[#FF5722]' : 'bg-white/10'}`} />
                                    ) : null}
                                </div>
                            );
                        })}
                    </div>

                    <div className="mb-6">
                        <h1 className="text-2xl font-semibold text-white">{copy.title}</h1>
                        <p className="text-sm text-white/60 mt-2">
                            {copy.stepLabel} {step} {copy.ofWord} 4: {stepTitles[step]}
                        </p>
                    </div>

                    {successMessage ? (
                        <div className="space-y-4">
                            <div
                                className="rounded-xl p-4 text-green-300 text-sm"
                                style={{ background: 'rgba(34,197,94,0.10)', border: '1px solid rgba(34,197,94,0.25)' }}
                            >
                                {successMessage}
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    className="px-4 py-3 rounded-xl text-sm font-semibold"
                                    style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)' }}
                                    onClick={() => setSuccessMessage('')}
                                >
                                    {copy.submitAnother}
                                </button>
                                <Link href="/login" className="px-4 py-3 rounded-xl text-sm font-semibold bg-[#FF5722] hover:bg-[#F4511E] transition-colors">
                                    {copy.goToLogin}
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (step < 4) {
                                    handleNext();
                                }
                            }}
                            className="space-y-4"
                        >
                            {error && (
                                <div
                                    className="text-red-400 px-4 py-3 rounded-xl text-sm"
                                    style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}
                                >
                                    {error}
                                </div>
                            )}

                            {step === 1 && (
                                <>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.businessName}<RequiredAsterisk />
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={form.business_name}
                                            onChange={(e) => setField('business_name', e.target.value)}
                                            placeholder={copy.placeholders.businessName}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.category}<RequiredAsterisk />
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={form.category}
                                                onChange={(e) => handleCategoryChange(e.target.value)}
                                                className={`${selectCls} pr-20`}
                                                style={inputStyle}
                                            >
                                                <option value="">{copy.selectCategory}</option>
                                                {CATEGORY_OPTIONS.map((option) => (
                                                    <option key={option} value={option}>
                                                        {CATEGORY_LABELS[locale][option]}
                                                    </option>
                                                ))}
                                            </select>
                                            {form.category ? (
                                                <button
                                                    type="button"
                                                    onClick={() => handleCategoryChange('')}
                                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                                    aria-label="Clear category"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▼</span>
                                        </div>
                                    </div>

                                    {form.category === 'Other' ? (
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">
                                                {copy.specifyCategory}<RequiredAsterisk />
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                value={form.category_other}
                                                onChange={(e) => setField('category_other', e.target.value)}
                                                placeholder={copy.placeholders.specifyCategory}
                                                className={inputCls}
                                                style={inputStyle}
                                            />
                                        </div>
                                    ) : null}

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.membership}<RequiredAsterisk />
                                        </label>
                                        <div className="relative">
                                            <select
                                                required
                                                value={form.membership}
                                                onChange={(e) => setField('membership', e.target.value)}
                                                className={`${selectCls} pr-20`}
                                                style={inputStyle}
                                            >
                                                <option value="">{copy.selectMembership}</option>
                                                {MEMBERSHIP_OPTIONS.map((option) => (
                                                    <option key={option} value={option}>
                                                        {MEMBERSHIP_LABELS[locale][option]}
                                                    </option>
                                                ))}
                                            </select>
                                            {form.membership ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setField('membership', '')}
                                                    className="absolute right-10 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                                                    aria-label="Clear membership"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            ) : null}
                                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-white/50">▼</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">{copy.labels.startDate}</label>
                                        <input
                                            type="date"
                                            value={form.start_date}
                                            onChange={(e) => setField('start_date', e.target.value)}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-2">{copy.labels.logo}</label>
                                        <div
                                            className="rounded-xl border border-dashed border-white/20 p-4"
                                            style={{ background: 'rgba(255,255,255,0.03)' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <label
                                                    htmlFor="logo-upload"
                                                    className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 cursor-pointer transition-colors inline-flex items-center gap-2"
                                                >
                                                    <Upload className="w-4 h-4" />
                                                    {logoUploading ? copy.buttons.uploading : copy.buttons.chooseFile}
                                                </label>
                                                <input
                                                    id="logo-upload"
                                                    type="file"
                                                    accept="image/png,image/jpeg,image/jpg,image/webp"
                                                    className="hidden"
                                                    onChange={handleLogoChange}
                                                />
                                                <span className="text-xs text-white/50">
                                                    {copy.fileTypes}
                                                </span>
                                            </div>
                                            {logoFileName ? (
                                                <p className="text-xs text-white/60 mt-2">{copy.uploaded}: {logoFileName}</p>
                                            ) : null}
                                            {form.logo_url ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={form.logo_url}
                                                    alt="Uploaded logo"
                                                    className="w-16 h-16 object-cover rounded-md border border-white/10 mt-3"
                                                />
                                            ) : null}
                                        </div>
                                    </div>
                                </>
                            )}

                            {step === 2 && (
                                <>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.clubBenefits}<RequiredAsterisk />
                                        </label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={form.club_benefits}
                                            onChange={(e) => setField('club_benefits', e.target.value)}
                                            placeholder={copy.placeholders.clubBenefits}
                                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.staffBenefits}<RequiredAsterisk />
                                        </label>
                                        <textarea
                                            required
                                            rows={4}
                                            value={form.staff_benefits}
                                            onChange={(e) => setField('staff_benefits', e.target.value)}
                                            placeholder={copy.placeholders.staffBenefits}
                                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                                            style={inputStyle}
                                        />
                                    </div>
                                </>
                            )}

                            {step === 3 && (
                                <>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.poc}<RequiredAsterisk />
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={form.poc_name}
                                            onChange={(e) => setField('poc_name', e.target.value)}
                                            placeholder={copy.placeholders.poc}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.phone}<RequiredAsterisk />
                                        </label>
                                        <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-3">
                                            <select
                                                required
                                                value={form.phone_country_code}
                                                onChange={(e) => setField('phone_country_code', e.target.value)}
                                                className={selectCls}
                                                style={inputStyle}
                                            >
                                                {PHONE_COUNTRY_CODES.map((code) => (
                                                    <option key={`${code.countryCode}-${code.value}`} value={code.value}>
                                                        {code.label}
                                                    </option>
                                                ))}
                                            </select>
                                            <input
                                                required
                                                type="text"
                                                value={form.phone}
                                                onChange={(e) => setField('phone', e.target.value)}
                                                placeholder={copy.placeholders.phone}
                                                className={inputCls}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.instagram}<RequiredAsterisk />
                                        </label>
                                        <input
                                            required
                                            type="text"
                                            value={form.instagram_handle}
                                            onChange={(e) => setField('instagram_handle', e.target.value)}
                                            placeholder={copy.placeholders.instagram}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">
                                            {copy.labels.loginEmail}<RequiredAsterisk />
                                        </label>
                                        <input
                                            required
                                            type="email"
                                            value={form.email}
                                            onChange={(e) => setField('email', e.target.value)}
                                            placeholder={copy.placeholders.loginEmail}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>
                                </>
                            )}

                            {step === 4 && (
                                <>
                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">{copy.labels.businessDescription}</label>
                                        <textarea
                                            rows={3}
                                            value={form.business_description}
                                            onChange={(e) => setField('business_description', e.target.value)}
                                            placeholder={copy.placeholders.businessDescription}
                                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/60 mb-2">{copy.labels.websiteUrl}</label>
                                            <div className="flex gap-2 mb-3">
                                                <button
                                                    type="button"
                                                    onClick={() => { if (!form.website_url) setField('website_url', ' '); }}
                                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${form.website_url
                                                        ? 'bg-[#FF5722] text-white shadow-lg shadow-orange-500/20'
                                                        : 'text-white/60 hover:bg-white/10'
                                                        }`}
                                                    style={form.website_url ? undefined : inputStyle}
                                                >
                                                    {copy.labels.websiteYes}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setField('website_url', '')}
                                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${!form.website_url
                                                        ? 'bg-white/15 text-white'
                                                        : 'text-white/60 hover:bg-white/10'
                                                        }`}
                                                    style={form.website_url ? inputStyle : undefined}
                                                >
                                                    {copy.labels.websiteNo}
                                                </button>
                                            </div>
                                            {form.website_url ? (
                                                <input
                                                    type="text"
                                                    value={form.website_url.trim()}
                                                    onChange={(e) => setField('website_url', e.target.value)}
                                                    placeholder={copy.placeholders.websiteUrl}
                                                    className={inputCls}
                                                    style={inputStyle}
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-xl px-4 py-3 text-sm text-white/50"
                                                    style={{ background: 'rgba(255,87,34,0.06)', border: '1px solid rgba(255,87,34,0.15)' }}
                                                >
                                                    {copy.labels.websiteNoMessage}{' '}
                                                    <a
                                                        href="https://webstarstudio.com"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-[#FF5722] font-semibold hover:underline"
                                                    >
                                                        Web Star Studio
                                                    </a>
                                                    {' '}{copy.labels.websiteNoMessageEnd}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">{copy.labels.contactEmail}</label>
                                            <input
                                                type="email"
                                                value={form.contact_email}
                                                onChange={(e) => setField('contact_email', e.target.value)}
                                                placeholder={copy.placeholders.contactEmail}
                                                className={inputCls}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">{copy.labels.city}</label>
                                            <input
                                                type="text"
                                                value={form.city}
                                                onChange={(e) => setField('city', e.target.value)}
                                                placeholder={copy.placeholders.city}
                                                className={inputCls}
                                                style={inputStyle}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-white/60 mb-1">{copy.labels.country}</label>
                                            <input
                                                type="text"
                                                value={form.country}
                                                onChange={(e) => setField('country', e.target.value)}
                                                placeholder={copy.placeholders.country}
                                                className={inputCls}
                                                style={inputStyle}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">{copy.labels.businessAddress}</label>
                                        <input
                                            type="text"
                                            value={form.business_address}
                                            onChange={(e) => setField('business_address', e.target.value)}
                                            placeholder={copy.placeholders.businessAddress}
                                            className={inputCls}
                                            style={inputStyle}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs text-white/60 mb-1">{copy.labels.notes}</label>
                                        <textarea
                                            rows={3}
                                            value={form.notes}
                                            onChange={(e) => setField('notes', e.target.value)}
                                            placeholder={copy.placeholders.notes}
                                            className="w-full px-4 py-4 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all resize-none"
                                            style={inputStyle}
                                        />
                                    </div>
                                </>
                            )}

                            <div className="flex gap-3 pt-2">
                                {step > 1 ? (
                                    <button
                                        type="button"
                                        onClick={handleBack}
                                        className="flex-1 py-4 rounded-xl font-semibold text-white/60 hover:text-white transition-colors"
                                        style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
                                    >
                                        {copy.buttons.back}
                                    </button>
                                ) : null}

                                {step < 4 ? (
                                    <button
                                        type="button"
                                        onClick={handleNext}
                                        className="flex-1 py-4 rounded-xl font-semibold text-white bg-[#FF5722] hover:bg-[#F4511E] transition-colors"
                                    >
                                        {copy.buttons.continue}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => void submitApplication()}
                                        disabled={loading || logoUploading}
                                        className="flex-1 py-4 rounded-xl font-semibold text-white bg-[#FF5722] hover:bg-[#F4511E] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <>
                                                <Loader2 className="w-5 h-5 animate-spin" />
                                                {copy.buttons.submitting}
                                            </>
                                        ) : (
                                            copy.buttons.submit
                                        )}
                                    </button>
                                )}
                            </div>
                        </form>
                    )}

                    <p className="text-center text-xs text-white/40 mt-6">
                        {copy.alreadyApproved}{' '}
                        <Link href="/login" className="text-white/60 hover:text-white transition-colors underline">
                            {copy.signIn}
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
