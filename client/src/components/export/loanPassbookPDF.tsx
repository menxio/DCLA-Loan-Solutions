import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

// Attach font files
(pdfMake as any).vfs = pdfFonts.vfs;

interface Member {
  firstName: string;
  lastName: string;
  middleName: string;
  contactNumber: string;
  centerLeader: string;
}

interface Loan {
  principalAmount: number | string;      // can arrive as string from backend
  weeklyPaymentAmount: number | string;  // can arrive as string from backend
  termWeek: number | string;             // can arrive as string
  createdAt: string | Date;              // ISO string in JSON, Date in code
  savings: number | string;
  weeksPaid: number | string;
}

export const generateLoanPassbookPDF = async (
  member: Member,
  loan: Loan,
  preview = false // 👈 control whether to preview or download
): Promise<string | void> => {

    // Normalize all values so we’re safe to use .toFixed(), etc.
    const principal = Number(loan.principalAmount);
    const weeklyPayment = Number(loan.weeklyPaymentAmount);
    const savings = Number(loan.savings);
    const termWeeks = Number(loan.termWeek);
    const weeksPaid = Number(loan.weeksPaid);
    const releaseDate = new Date(loan.createdAt);

    const fullName = `${member.lastName.toUpperCase()}, ${member.firstName.toUpperCase()} ${
      member.middleName?.[0]?.toUpperCase() || ''
    }.`;

    // Build payment schedule
    const schedule = Array.from({ length: termWeeks }, (_, i) => {
      const dueDate = new Date(releaseDate);
      dueDate.setDate(releaseDate.getDate() + i * 7);
      return {
        week: i + 1,
        date: dueDate.toLocaleDateString('en-PH', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        signature: '',
        amount: `₱${weeklyPayment.toFixed(2)}`,
        paid: i < weeksPaid,
      };
    });

    // Split schedule into 2 columns
    const leftCol = schedule.slice(0, Math.ceil(schedule.length / 2));
    const rightCol = schedule.slice(Math.ceil(schedule.length / 2));

    // Table body with headers
    const body: any[] = [
      [
        { text: '#', bold: true },
        { text: 'Date', bold: true },
        { text: 'Amount', bold: true },
        { text: 'BM/AO Signature', bold: true },
        { text: 'Remarks', bold: true },
        {},
        { text: '#', bold: true },
        { text: 'Date', bold: true },
        { text: 'Amount', bold: true },
        { text: 'BM/AO Signature', bold: true },
        { text: 'Remarks', bold: true },
      ],
    ];

    for (let i = 0; i < leftCol.length; i++) {
      const left = leftCol[i];
      const right = rightCol[i];

      body.push([
        { text: left.week.toString() },
        { text: left.date },
        { text: left.amount },
        left.paid ? { text: 'Paid' } : { text: '' },
        {},
        right ? { text: right.week.toString() } : { text: '' },
        right ? { text: right.date } : { text: '' },
        right ? { text: right.amount } : { text: '' },
        right && right.paid ? { text: 'Paid' } : { text: '' },
      ]);
    }

    const docDefinition: TDocumentDefinitions = {
<<<<<<< Updated upstream
        content: [
            // HEADER
            {
            table: {
                widths: ['*'],
                body: [[{ text: 'DCLA LOAN SOLUTIONS', bold: true, alignment: 'center', fontSize: 14 }]]
=======
      pageSize: 'A4',
      pageOrientation: 'portrait',
      background: (currentPage, pageSize) => ({
        image: logo,
        width: 300,
        opacity: 0.05,
        absolutePosition: {
          x: pageSize.width / 2 - 150,
          y: pageSize.height / 2 - 150,
        },
      } as any),
      content: [
          // HEADER
          {
          table: {
              widths: ['*'],
                body: [[{ text: 'DCLA LOAN SOLUTIONS', bold: true, alignment: 'center', fontSize: 12 }]]
>>>>>>> Stashed changes
            },
            layout: 'noBorders',
            margin: [0, 0, 0, 10],
            },

            // CLIENT INFO + LOAN INFO (like in the passbook photo)
            {
            table: {
              widths: ['25%', '35%', '20%', '20%'],
              body: [
                [
                    { text: 'Client Name', bold: true }, 
                    { text: fullName, colSpan: 1 },
                    { text: 'Loan Amount', bold: true }, 
                    { text: `₱${principal.toLocaleString()}`, bold: true, color: 'red' },
                ],
                [
                    { text: 'Center Leader', bold: true }, 
                    { text: member.centerLeader }, 
                    { text: 'Release Date', bold: true }, 
                    { text: releaseDate.toLocaleDateString('en-PH') },
                ],
                [
                    { text: 'Contact Number', bold: true },
                    { text: member.contactNumber },
                    { text: 'Savings', bold: true },
                    { text: `₱${savings.toFixed(2)}`, color: 'blue' },
                ],
              ],
            },
            margin: [0, 0, 0, 10],
            },

            // PAYMENT SCHEDULE
            {
            table: {
                headerRows: 1,
                widths: ['auto', '*', '*', '*', '*'],
                body: [
                [
                    { text: '#', bold: true },
                    { text: 'Date', bold: true },
                    { text: 'Amount', bold: true },
                    { text: 'BM/AO Signature', bold: true },
                    { text: 'Remarks', bold: true },
                ],
                ...schedule.map(s => [
                    s.week,
                    s.date,
                    s.amount,
                    s.signature,
                    s.paid ? 'Paid' : ''
                ])
                ],
            },
            },
            {
            table: {
                widths: ['*'],
                body: [[{ text: '| Thank you for trusting DCLA Loan Solutions |', alignment: 'center', fontSize: 8, italics: true }]]
            },
            layout: 'noBorders',
            margin: [0, 20, 0, 10],
            },
        ],
        defaultStyle: {
            fontSize: 7,
        },
        };

    if (preview) {
      // 👇 instead of downloading, return a blob URL for embedding
      return new Promise<string>((resolve) => {
        pdfMake.createPdf(docDefinition).getBlob((blob) => {
          const url = URL.createObjectURL(blob);
          resolve(url); // ✅ works here
        });
      });
    } else {
      // 👇 default behavior: download directly
      pdfMake.createPdf(docDefinition).download(
        `loan_passbook_${member.lastName}.pdf`
      );
      return;
    }
};
