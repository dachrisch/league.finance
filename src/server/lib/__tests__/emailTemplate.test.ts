import { describe, it, expect } from 'vitest';
import { generateOfferEmailSubject, generateOfferEmailBody } from '../emailTemplate';

describe('emailTemplate', () => {
  describe('generateOfferEmailSubject', () => {
    it('should generate subject with association and season name', () => {
      const subject = generateOfferEmailSubject('Northern League', '2024 Spring');
      expect(subject).toBe('Offer: Northern League - 2024 Spring Season');
    });

    it('should handle different association names', () => {
      const subject = generateOfferEmailSubject('South Valley Soccer', '2024 Fall');
      expect(subject).toContain('South Valley Soccer');
      expect(subject).toContain('2024 Fall');
    });

    it('should format consistently', () => {
      const subject = generateOfferEmailSubject('Test Org', 'Test Season');
      expect(subject).toMatch(/^Offer: .+ - .+ Season$/);
    });

    it('should handle special characters in names', () => {
      const subject = generateOfferEmailSubject("O'Brien's League", "2024-2025");
      expect(subject).toContain("O'Brien's League");
      expect(subject).toContain('2024-2025');
    });

    it('should not include extra spaces', () => {
      const subject = generateOfferEmailSubject('Test', 'Season');
      expect(subject).not.toMatch(/  /); // No double spaces
    });
  });

  describe('generateOfferEmailBody', () => {
    const testData = {
      associationName: 'Test Association',
      seasonName: '2024 Season',
      leagueNames: ['Premier League', 'Division One', 'Youth League'],
      totalPrice: 2500.5,
      driveLink: 'https://drive.google.com/file/d/test123/view',
    };

    it('should generate HTML body with all required sections', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        testData.leagueNames,
        testData.totalPrice,
        testData.driveLink
      );

      expect(body).toContain('Offer for Test Association');
      expect(body).toContain('2024 Season');
      expect(body).toContain('Premier League');
      expect(body).toContain('Division One');
      expect(body).toContain('Youth League');
      expect(body).toContain('2500.50');
      expect(body).toContain(testData.driveLink);
    });

    it('should be valid HTML', () => {
      const body = generateOfferEmailBody(...Object.values(testData) as any);
      expect(body).toContain('<html>');
      expect(body).toContain('</html>');
      expect(body).toContain('<body');
      expect(body).toContain('</body>');
    });

    it('should include leagues as list items', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        ['League A', 'League B'],
        100,
        testData.driveLink
      );

      expect(body).toContain('<li>League A</li>');
      expect(body).toContain('<li>League B</li>');
    });

    it('should format price with 2 decimal places', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        100.1,
        testData.driveLink
      );

      expect(body).toContain('100.10');
    });

    it('should format price with large values', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        999999.99,
        testData.driveLink
      );

      expect(body).toContain('999999.99');
    });

    it('should include call-to-action button with link', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        100,
        testData.driveLink
      );

      expect(body).toContain('href="' + testData.driveLink + '"');
      expect(body).toContain('View Offer Details');
    });

    it('should include footer with offer validity', () => {
      const body = generateOfferEmailBody(...Object.values(testData) as any);
      expect(body).toContain('30 days');
      expect(body).toContain('offer is valid');
    });

    it('should include professional greeting', () => {
      const body = generateOfferEmailBody(...Object.values(testData) as any);
      expect(body).toContain('Hello,');
      expect(body).toContain('Best regards');
      expect(body).toContain('Leagues Finance Team');
    });

    it('should handle empty league list', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        100,
        testData.driveLink
      );

      expect(body).toContain('Offer for Test Association');
      expect(body).not.toContain('<li>');
    });

    it('should handle single league', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        ['Only League'],
        100,
        testData.driveLink
      );

      expect(body).toContain('<li>Only League</li>');
    });

    it('should handle many leagues', () => {
      const leagues = Array.from({ length: 20 }, (_, i) => `League ${i + 1}`);
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        leagues,
        100,
        testData.driveLink
      );

      expect(body).toContain('League 1');
      expect(body).toContain('League 20');
    });

    it('should include styling for professional appearance', () => {
      const body = generateOfferEmailBody(...Object.values(testData) as any);
      expect(body).toContain('font-family: Arial, sans-serif');
      expect(body).toContain('color: #333');
      expect(body).toContain('color: #2c5aa0');
    });

    it('should have clickable price button', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        500,
        testData.driveLink
      );

      expect(body).toContain('background-color: #2c5aa0');
      expect(body).toContain('display: inline-block');
    });

    it('should handle special characters in league names', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        ["O'Brien's League", "East & West Division"],
        100,
        testData.driveLink
      );

      expect(body).toContain("O'Brien's League");
      expect(body).toContain("East & West Division");
    });

    it('should handle special characters in association name', () => {
      const body = generateOfferEmailBody(
        "Smith & Co. Youth Soccer",
        testData.seasonName,
        [],
        100,
        testData.driveLink
      );

      expect(body).toContain("Smith & Co. Youth Soccer");
    });

    it('should handle zero price', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        0,
        testData.driveLink
      );

      expect(body).toContain('0.00');
    });

    it('should handle negative price (credit)', () => {
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [],
        -100,
        testData.driveLink
      );

      expect(body).toContain('-100.00');
    });

    it('should not break with very long league names', () => {
      const longLeagueName = 'A'.repeat(500);
      const body = generateOfferEmailBody(
        testData.associationName,
        testData.seasonName,
        [longLeagueName],
        100,
        testData.driveLink
      );

      expect(body).toContain(longLeagueName);
    });
  });
});
