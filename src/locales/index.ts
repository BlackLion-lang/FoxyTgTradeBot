import { en } from './en';
import { fr } from './fr';
import { Translations } from './types';
import { User } from '../models/user';

export type SupportedLanguage = 'en' | 'fr';

const translations: Record<SupportedLanguage, Translations> = {
    en,
    fr,
};

export class LanguageManager {
    private static instance: LanguageManager;
    private currentLanguage: SupportedLanguage = 'fr';

    private constructor() {}

    public static getInstance(): LanguageManager {
        if (!LanguageManager.instance) {
            LanguageManager.instance = new LanguageManager();
        }
        return LanguageManager.instance;
    }

    public setLanguage(language: SupportedLanguage): void {
        this.currentLanguage = language;
    }

    public getLanguage(): SupportedLanguage {
        return this.currentLanguage;
    }

    public getTranslations(language?: SupportedLanguage): Translations {
        const lang = language || this.currentLanguage;
        return translations[lang] || translations.en;
    }

    public t(key: string, language?: SupportedLanguage): string {
        const trans = this.getTranslations(language);
        return this.getNestedValue(trans, key) || key;
    }

    private getNestedValue(obj: any, path: string): string {
        return path.split('.').reduce((current, key) => {
            return current && current[key] !== undefined ? current[key] : undefined;
        }, obj);
    }
}

// Helper function to get user-specific language
export async function getUserLanguage(userId: number): Promise<SupportedLanguage> {
    const user = await User.findOne({ userId });
    return (user?.language as SupportedLanguage) || 'fr';
}

// This should update the user's language in DB (you can wire it later)
export async function setUserLanguage(userId: number, language: SupportedLanguage): Promise<void> {
    const user = await User.findOne({ userId });
    if (!user) {
        // Don't create new users just to set language - user must exist first
        console.warn(`Cannot set language for non-existent user: ${userId}`);
        return;
    }
    user.language = language;
    await user.save();
}

// Helper function to get translated text for a specific user
export async function t(key: string, userId?: number): Promise<string> {
    const language = userId ? await getUserLanguage(userId) : 'fr';
    return LanguageManager.getInstance().t(key, language);
}

// Export translations for direct use
export { en, fr };
export * from './types';
