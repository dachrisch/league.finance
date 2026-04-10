export function generateOfferEmailSubject(associationName: string, seasonName: string): string {
  return `Offer: ${associationName} - ${seasonName} Season`;
}

export function generateOfferEmailBody(
  associationName: string,
  seasonName: string,
  leagueNames: string[],
  totalPrice: number,
  driveLink: string
): string {
  const leagueList = leagueNames.map((name) => `<li>${name}</li>`).join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Offer for ${associationName}</h2>

        <p>Hello,</p>

        <p>We're pleased to present the attached offer for <strong>${associationName}</strong> for the <strong>${seasonName}</strong> season.</p>

        <h3>Leagues Included:</h3>
        <ul>
          ${leagueList}
        </ul>

        <h3>Total Price: <span style="color: #2c5aa0; font-weight: bold;">$${totalPrice.toFixed(2)}</span></h3>

        <p>
          <a href="${driveLink}" style="display: inline-block; background-color: #2c5aa0; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
            View Offer Details
          </a>
        </p>

        <p>Please review the attached offer and let us know if you have any questions or would like to discuss customizations.</p>

        <p>Best regards,<br/>Leagues Finance Team</p>

        <hr/>
        <p style="font-size: 12px; color: #999;">This offer is valid for 30 days from the date sent.</p>
      </body>
    </html>
  `;
}
