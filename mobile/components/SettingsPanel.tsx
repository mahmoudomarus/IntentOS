import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
    Animated,
    Dimensions,
} from 'react-native';
import { T } from '../theme';
import { useTheme } from './ThemeProvider';
import { generateAPIUrl } from '../utils';

// ═══════════════════════════════════════════════════════
// Settings Panel — OpenClaw Setup UI
// ═══════════════════════════════════════════════════════

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type ProfileStatus = {
    id: string;
    provider: string;
    maskedKey: string;
    configured: boolean;
};

type ProviderConfig = {
    id: string;
    label: string;
    placeholder: string;
    description: string;
    icon: string;
    color: string;
};

const PROVIDERS: ProviderConfig[] = [
    {
        id: 'anthropic',
        label: 'Anthropic',
        placeholder: 'sk-ant-api03-...',
        description: 'Claude models (required for OpenClaw agent)',
        icon: '🧠',
        color: '#D97757',
    },
    {
        id: 'openai',
        label: 'OpenAI',
        placeholder: 'sk-...',
        description: 'GPT & Realtime voice models',
        icon: '⚡',
        color: '#10A37F',
    },
    {
        id: 'google',
        label: 'Google AI',
        placeholder: 'AIza...',
        description: 'Gemini models',
        icon: '🔷',
        color: '#4285F4',
    },
    {
        id: 'groq',
        label: 'Groq',
        placeholder: 'gsk_...',
        description: 'Ultra-fast inference (Llama, Mixtral)',
        icon: '🚀',
        color: '#F55036',
    },
];

interface Props {
    visible: boolean;
    onClose: () => void;
    gatewayStatus?: 'disconnected' | 'connecting' | 'handshaking' | 'connected';
}

export default function SettingsPanel({ visible, onClose, gatewayStatus }: Props) {
    const { colors, isDark } = useTheme();
    const styles = React.useMemo(() => createStyles(colors, T, isDark), [colors, isDark]);
    const [profiles, setProfiles] = useState<ProfileStatus[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState<string | null>(null);
    const [inputs, setInputs] = useState<Record<string, string>>({});
    const [soul, setSoul] = useState<string>('');
    const [soulSaving, setSoulSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
    const [slideAnim] = useState(new Animated.Value(SCREEN_WIDTH));

    // Animate in/out
    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: visible ? 0 : SCREEN_WIDTH,
            useNativeDriver: true,
            tension: 65,
            friction: 11,
        }).start();
    }, [visible]);

    // Load profiles on open
    useEffect(() => {
        if (visible) {
            loadProfiles();
        }
    }, [visible]);

    const loadProfiles = useCallback(async () => {
        setLoading(true);
        try {
            const headers: Record<string, string> = {};
            if (process.env.EXPO_PUBLIC_INTENT_OS_SECRET) {
                headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_INTENT_OS_SECRET}`;
            }
            const [authRes, soulRes] = await Promise.all([
                fetch(generateAPIUrl('/api/openclaw/auth?agentId=main'), { headers }),
                fetch(generateAPIUrl('/api/openclaw/soul?agentId=main'), { headers }).catch(() => null)
            ]);

            const authData = await authRes.json();
            setProfiles(authData.profiles || []);

            if (soulRes && soulRes.ok) {
                const soulData = await soulRes.json();
                setSoul(soulData.soul || '');
            }
        } catch {
            setProfiles([]);
        }
        setLoading(false);
    }, []);

    const saveApiKey = useCallback(async (provider: string) => {
        const apiKey = inputs[provider]?.trim();
        if (!apiKey) return;

        setSaving(provider);
        setMessage(null);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (process.env.EXPO_PUBLIC_INTENT_OS_SECRET) {
                headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_INTENT_OS_SECRET}`;
            }
            const res = await fetch(generateAPIUrl('/api/openclaw/auth'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ agentId: 'main', provider, apiKey }),
            });
            const data = await res.json();
            if (data.ok) {
                setMessage({ text: `${provider} API key saved`, type: 'success' });
                setInputs((prev) => ({ ...prev, [provider]: '' }));
                await loadProfiles();
            } else {
                setMessage({ text: data.error || 'Failed to save', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err?.message || 'Network error', type: 'error' });
        }
        setSaving(null);
    }, [inputs, loadProfiles]);

    const removeProfile = useCallback(async (profileId: string, provider: string) => {
        setMessage(null);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (process.env.EXPO_PUBLIC_INTENT_OS_SECRET) {
                headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_INTENT_OS_SECRET}`;
            }
            await fetch(generateAPIUrl('/api/openclaw/auth'), {
                method: 'DELETE',
                headers,
                body: JSON.stringify({ agentId: 'main', profileId }),
            });
            setMessage({ text: `${provider} key removed`, type: 'success' });
            await loadProfiles();
        } catch {
            setMessage({ text: 'Failed to remove', type: 'error' });
        }
    }, [loadProfiles]);

    const saveSoul = useCallback(async () => {
        setSoulSaving(true);
        setMessage(null);
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (process.env.EXPO_PUBLIC_INTENT_OS_SECRET) {
                headers['Authorization'] = `Bearer ${process.env.EXPO_PUBLIC_INTENT_OS_SECRET}`;
            }
            const res = await fetch(generateAPIUrl('/api/openclaw/soul'), {
                method: 'POST',
                headers,
                body: JSON.stringify({ agentId: 'main', soul }),
            });
            const data = await res.json();
            if (data.ok) {
                setMessage({ text: `Agent Identity (SOUL) saved`, type: 'success' });
            } else {
                setMessage({ text: data.error || 'Failed to save SOUL.md', type: 'error' });
            }
        } catch (err: any) {
            setMessage({ text: err?.message || 'Network error', type: 'error' });
        }
        setSoulSaving(false);
    }, [soul]);

    const isConfigured = (providerId: string) =>
        profiles.some((p) => p.provider === providerId && p.configured);

    const getMaskedKey = (providerId: string) =>
        profiles.find((p) => p.provider === providerId)?.maskedKey || '';

    if (!visible) return null;

    return (
        <Animated.View
            style={[
                styles.overlay,
                { transform: [{ translateX: slideAnim }] },
            ]}
        >
            <View style={styles.panel}>
                {/* ── Header ── */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerTitle}>SETTINGS</Text>
                        <Text style={styles.headerSubtitle}>OpenClaw Configuration</Text>
                    </View>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                        <Text style={styles.closeBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
                    {/* ── Gateway Status ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>GATEWAY</Text>
                        <View style={styles.statusRow}>
                            <View style={[
                                styles.statusDot,
                                gatewayStatus === 'connected' ? styles.statusGreen : styles.statusRed,
                            ]} />
                            <Text style={styles.statusText}>
                                {gatewayStatus === 'connected'
                                    ? 'Connected (ws://localhost:4200)'
                                    : gatewayStatus === 'connecting' || gatewayStatus === 'handshaking'
                                        ? 'Connecting...'
                                        : 'Disconnected'}
                            </Text>
                        </View>
                    </View>

                    {/* ── Message Banner ── */}
                    {message && (
                        <View style={[
                            styles.messageBanner,
                            message.type === 'success' ? styles.messageBannerSuccess : styles.messageBannerError,
                        ]}>
                            <Text style={[
                                styles.messageText,
                                message.type === 'success' ? styles.messageTextSuccess : styles.messageTextError,
                            ]}>
                                {message.type === 'success' ? '✓' : '✗'} {message.text}
                            </Text>
                        </View>
                    )}

                    {/* ── API Keys ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>API KEYS</Text>
                        <Text style={styles.sectionHint}>
                            Configure model provider API keys for the OpenClaw agent
                        </Text>

                        {loading ? (
                            <ActivityIndicator color={colors.accent} style={{ marginTop: T.s6 }} />
                        ) : (
                            PROVIDERS.map((prov) => {
                                const configured = isConfigured(prov.id);
                                const masked = getMaskedKey(prov.id);
                                const isSaving = saving === prov.id;

                                return (
                                    <View key={prov.id} style={styles.providerCard}>
                                        <View style={styles.providerHeader}>
                                            <View style={styles.providerLeft}>
                                                <Text style={styles.providerIcon}>{prov.icon}</Text>
                                                <View>
                                                    <Text style={styles.providerLabel}>{prov.label}</Text>
                                                    <Text style={styles.providerDesc}>{prov.description}</Text>
                                                </View>
                                            </View>
                                            <View style={[
                                                styles.statusBadge,
                                                configured ? styles.statusBadgeActive : styles.statusBadgeInactive,
                                            ]}>
                                                <Text style={[
                                                    styles.statusBadgeText,
                                                    configured ? styles.statusBadgeTextActive : null,
                                                ]}>
                                                    {configured ? 'CONFIGURED' : 'NOT SET'}
                                                </Text>
                                            </View>
                                        </View>

                                        {configured && (
                                            <View style={styles.configuredRow}>
                                                <Text style={styles.maskedKey}>{masked}</Text>
                                                <TouchableOpacity
                                                    onPress={() => removeProfile(`${prov.id}-api-key`, prov.label)}
                                                    style={styles.removeBtn}
                                                >
                                                    <Text style={styles.removeBtnText}>Remove</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        <View style={styles.inputRow}>
                                            <TextInput
                                                style={styles.apiInput}
                                                placeholder={prov.placeholder}
                                                placeholderTextColor={colors.textMuted}
                                                value={inputs[prov.id] || ''}
                                                onChangeText={(v) => setInputs((prev) => ({ ...prev, [prov.id]: v }))}
                                                secureTextEntry
                                                autoCapitalize="none"
                                                autoCorrect={false}
                                            />
                                            <TouchableOpacity
                                                style={[
                                                    styles.saveBtn,
                                                    !inputs[prov.id]?.trim() && styles.saveBtnDisabled,
                                                ]}
                                                onPress={() => saveApiKey(prov.id)}
                                                disabled={!inputs[prov.id]?.trim() || isSaving}
                                            >
                                                {isSaving ? (
                                                    <ActivityIndicator color={colors.bg} size="small" />
                                                ) : (
                                                    <Text style={styles.saveBtnText}>
                                                        {configured ? 'Update' : 'Save'}
                                                    </Text>
                                                )}
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                );
                            })
                        )}
                    </View>

                    {/* ── Agent Identity (SOUL.md) ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>AGENT IDENTITY</Text>
                        <Text style={styles.sectionHint}>
                            Define the boundaries and persona of your agent (SOUL.md)
                        </Text>

                        <View style={styles.soulCard}>
                            <TextInput
                                style={styles.soulInput}
                                multiline
                                placeholder="Enter system instructions..."
                                placeholderTextColor={colors.textMuted}
                                value={soul}
                                onChangeText={setSoul}
                                textAlignVertical="top"
                            />
                            <TouchableOpacity
                                style={[styles.saveBtn, { marginTop: T.s3, alignSelf: 'flex-start' }]}
                                onPress={saveSoul}
                                disabled={soulSaving}
                            >
                                {soulSaving ? (
                                    <ActivityIndicator color={colors.bg} size="small" />
                                ) : (
                                    <Text style={styles.saveBtnText}>Save SOUL.md</Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* ── Info ── */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>ABOUT</Text>
                        <Text style={styles.infoText}>
                            API keys are stored locally in{' '}
                            <Text style={styles.codePath}>~/.openclaw/agents/main/agent/auth-profiles.json</Text>
                            {' '}and are never sent to external services except the provider they belong to.
                        </Text>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </View>
        </Animated.View>
    );
}

// ═══════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════
const createStyles = (colors: any, T: any, isDark: boolean) => StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.7)',
        zIndex: 1000,
    },
    panel: {
        flex: 1,
        backgroundColor: colors.bg,
        borderLeftWidth: 1,
        borderLeftColor: colors.border,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: T.s6,
        paddingTop: T.s7,
        paddingBottom: T.s5,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        color: colors.textPrimary,
        fontSize: T.fontSm,
        fontWeight: T.semibold,
        letterSpacing: 3,
    },
    headerSubtitle: {
        color: colors.textTertiary,
        fontSize: T.fontXs,
        marginTop: 2,
    },
    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: T.radiusXs,
        backgroundColor: colors.cardBgHover,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    closeBtnText: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    scroll: {
        flex: 1,
        paddingHorizontal: T.s6,
    },
    section: {
        marginTop: T.s6,
    },
    sectionTitle: {
        color: colors.textTertiary,
        fontSize: T.fontXs,
        fontWeight: T.semibold,
        letterSpacing: 2,
        marginBottom: T.s3,
    },
    sectionHint: {
        color: colors.textTertiary,
        fontSize: T.fontSm,
        marginBottom: T.s4,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBg,
        padding: T.s4,
        borderRadius: T.radiusSm,
        borderWidth: 1,
        borderColor: colors.border,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: T.s3,
    },
    statusGreen: {
        backgroundColor: colors.success,
        shadowColor: colors.success,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },
    statusRed: {
        backgroundColor: colors.danger,
    },
    statusText: {
        color: colors.textSecondary,
        fontSize: T.fontSm,
    },
    messageBanner: {
        marginTop: T.s4,
        padding: T.s3,
        borderRadius: T.radiusXs,
        borderWidth: 1,
    },
    messageBannerSuccess: {
        backgroundColor: colors.successLight,
        borderColor: 'rgba(34,197,94,0.2)',
    },
    messageBannerError: {
        backgroundColor: colors.dangerLight,
        borderColor: 'rgba(239,68,68,0.2)',
    },
    messageText: {
        fontSize: T.fontSm,
    },
    messageTextSuccess: {
        color: colors.success,
    },
    messageTextError: {
        color: colors.danger,
    },
    providerCard: {
        backgroundColor: colors.cardBg,
        borderRadius: T.radiusSm,
        borderWidth: 1,
        borderColor: colors.border,
        padding: T.s4,
        marginBottom: T.s3,
    },
    providerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: T.s3,
    },
    providerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: T.s3,
    },
    providerIcon: {
        fontSize: 20,
    },
    providerLabel: {
        color: colors.textPrimary,
        fontSize: T.fontBase,
        fontWeight: T.semibold,
    },
    providerDesc: {
        color: colors.textTertiary,
        fontSize: T.fontXs,
        marginTop: 1,
    },
    statusBadge: {
        borderRadius: T.radiusXs,
        paddingHorizontal: T.s2,
        paddingVertical: 2,
        borderWidth: 1,
    },
    statusBadgeActive: {
        borderColor: 'rgba(34,197,94,0.3)',
        backgroundColor: 'rgba(34,197,94,0.08)',
    },
    statusBadgeInactive: {
        borderColor: colors.border,
        backgroundColor: 'transparent',
    },
    statusBadgeText: {
        fontSize: 8,
        fontWeight: T.semibold,
        letterSpacing: 1,
        color: colors.textTertiary,
    },
    statusBadgeTextActive: {
        color: colors.success,
    },
    configuredRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: T.s3,
        paddingHorizontal: T.s2,
    },
    maskedKey: {
        color: colors.textSecondary,
        fontSize: T.fontSm,
        fontFamily: 'monospace',
    },
    removeBtn: {
        paddingHorizontal: T.s3,
        paddingVertical: T.s1,
        borderRadius: T.radiusXs,
        borderWidth: 1,
        borderColor: 'rgba(239,68,68,0.2)',
        backgroundColor: colors.dangerLight,
    },
    removeBtnText: {
        color: colors.danger,
        fontSize: T.fontXs,
        fontWeight: T.semibold,
    },
    inputRow: {
        flexDirection: 'row',
        gap: T.s2,
    },
    apiInput: {
        flex: 1,
        backgroundColor: colors.cardBg,
        borderRadius: T.radiusXs,
        borderWidth: 1,
        borderColor: colors.border,
        paddingHorizontal: T.s3,
        paddingVertical: T.s3,
        color: colors.textPrimary,
        fontSize: T.fontSm,
        fontFamily: 'monospace',
    },
    saveBtn: {
        backgroundColor: colors.accent,
        borderRadius: T.radiusXs,
        paddingHorizontal: T.s5,
        paddingVertical: T.s3,
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 70,
    },
    saveBtnDisabled: {
        opacity: 0.3,
    },
    saveBtnText: {
        color: colors.bg,
        fontSize: T.fontSm,
        fontWeight: T.semibold,
    },
    infoText: {
        color: colors.textTertiary,
        fontSize: T.fontSm,
        lineHeight: 18,
    },
    soulCard: {
        backgroundColor: colors.cardBg,
        borderRadius: T.radiusSm,
        borderWidth: 1,
        borderColor: colors.border,
        padding: T.s4,
    },
    soulInput: {
        color: colors.textPrimary,
        fontSize: T.fontSm,
        fontFamily: 'monospace',
        minHeight: 120,
    },
    codePath: {
        fontFamily: 'monospace',
        color: colors.textSecondary,
        fontSize: T.fontXs,
    },
});
