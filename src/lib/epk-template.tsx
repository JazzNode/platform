import React from 'react';
import { Document, Page, Text, View, StyleSheet, Link } from '@react-pdf/renderer';

const gold = '#C8A84E';
const dark = '#0A0A0A';
const muted = '#999';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#FFFFFF', fontFamily: 'Helvetica' },
  header: { marginBottom: 24, borderBottomWidth: 2, borderBottomColor: gold, paddingBottom: 16 },
  name: { fontSize: 28, fontWeight: 'bold', color: dark, marginBottom: 4 },
  subtitle: { fontSize: 12, color: muted },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: gold, marginBottom: 8, textTransform: 'uppercase' as const, letterSpacing: 1 },
  text: { fontSize: 10, color: '#333', lineHeight: 1.5 },
  row: { flexDirection: 'row' as const, marginBottom: 4 },
  label: { fontSize: 10, color: muted, width: 100 },
  value: { fontSize: 10, color: dark, flex: 1 },
  badge: { fontSize: 9, color: gold, marginRight: 8 },
  eventRow: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 6, paddingBottom: 4, borderBottomWidth: 0.5, borderBottomColor: '#eee' },
  eventTitle: { fontSize: 10, color: dark, flex: 1 },
  eventDate: { fontSize: 9, color: muted, width: 80, textAlign: 'right' as const },
  gearRow: { marginBottom: 6 },
  gearName: { fontSize: 10, fontWeight: 'bold', color: dark },
  gearDetail: { fontSize: 9, color: muted },
  footer: { position: 'absolute' as const, bottom: 30, left: 40, right: 40, borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 8, flexDirection: 'row' as const, justifyContent: 'space-between' as const },
  footerText: { fontSize: 8, color: muted },
  link: { fontSize: 10, color: gold, textDecoration: 'none' as const },
});

interface EPKProps {
  artist: Record<string, unknown>;
  gear: { gear_name: string; gear_type: string; brand?: string; model?: string }[];
  events: { title_en: string; start_at: string }[];
  badgeNames: string[];
  tier: number;
}

export function buildEPKDocument({ artist, gear, events, badgeNames, tier }: EPKProps) {
  const name = (artist.display_name || artist.name_en || artist.artist_id) as string;
  const bio = (artist.bio_en || '') as string;
  const instrument = (artist.primary_instrument || '') as string;
  const country = (artist.country_code || '') as string;

  const socialLinks: { label: string; url: string }[] = [];
  if (artist.website_url) socialLinks.push({ label: 'Website', url: artist.website_url as string });
  if (artist.spotify_url) socialLinks.push({ label: 'Spotify', url: artist.spotify_url as string });
  if (artist.youtube_url) socialLinks.push({ label: 'YouTube', url: artist.youtube_url as string });
  if (artist.instagram) socialLinks.push({ label: 'Instagram', url: `https://instagram.com/${artist.instagram}` });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.subtitle}>
            {[instrument, country].filter(Boolean).join(' · ')}
            {tier >= 2 ? ' · Premium Artist' : ''}
          </Text>
        </View>

        {/* Bio */}
        {bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Biography</Text>
            <Text style={styles.text}>{bio}</Text>
          </View>
        )}

        {/* Badges */}
        {badgeNames.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Achievements</Text>
            <View style={styles.row}>
              {badgeNames.map((b, i) => (
                <Text key={i} style={styles.badge}>★ {b}</Text>
              ))}
            </View>
          </View>
        )}

        {/* Social Links */}
        {socialLinks.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Links</Text>
            {socialLinks.map((l, i) => (
              <View key={i} style={styles.row}>
                <Text style={styles.label}>{l.label}</Text>
                <Link style={styles.link} src={l.url}>{l.url}</Link>
              </View>
            ))}
          </View>
        )}

        {/* Upcoming Events */}
        {events.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Performances</Text>
            {events.map((e, i) => (
              <View key={i} style={styles.eventRow}>
                <Text style={styles.eventTitle}>{e.title_en}</Text>
                <Text style={styles.eventDate}>
                  {new Date(e.start_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Gear (Tier 2 only) */}
        {tier >= 2 && gear.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gear & Equipment</Text>
            {gear.map((g, i) => (
              <View key={i} style={styles.gearRow}>
                <Text style={styles.gearName}>{g.gear_name}</Text>
                <Text style={styles.gearDetail}>
                  {[g.brand, g.model].filter(Boolean).join(' · ') || g.gear_type}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Teaching (if accepting students) */}
        {artist.accepting_students && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Teaching</Text>
            {artist.teaching_description_en && (
              <Text style={styles.text}>{artist.teaching_description_en as string}</Text>
            )}
            {artist.lesson_price_range && (
              <View style={{ ...styles.row, marginTop: 4 }}>
                <Text style={styles.label}>Lesson rates</Text>
                <Text style={styles.value}>{artist.lesson_price_range as string}</Text>
              </View>
            )}
          </View>
        )}

        {/* Hire info (Tier 2) */}
        {tier >= 2 && artist.available_for_hire && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Available for Hire</Text>
            {artist.hire_description_en && (
              <Text style={styles.text}>{artist.hire_description_en as string}</Text>
            )}
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>Electronic Press Kit · {name}</Text>
          <Text style={styles.footerText}>Generated by JazzNode · {new Date().toLocaleDateString()}</Text>
        </View>
      </Page>
    </Document>
  );
}
