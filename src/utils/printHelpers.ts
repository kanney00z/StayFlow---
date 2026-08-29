import { LeaseContract, PropertyProfile, Room, UtilityBill } from '../types';
import { formatCurrency, formatDateThai } from './formatters';

/**
 * Robust print helper that prints a specific HTML container or generates a clean A4 print document.
 * Works inside modals and sandboxed iframes by using an isolated hidden iframe.
 */
export function printHtmlContent(title: string, htmlBody: string): void {
  try {
    // Create a hidden print iframe
    const printFrameId = 'isolated-print-frame';
    let frame = document.getElementById(printFrameId) as HTMLIFrameElement | null;
    
    if (frame) {
      document.body.removeChild(frame);
    }

    frame = document.createElement('iframe');
    frame.id = printFrameId;
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    frame.style.visibility = 'hidden';
    document.body.appendChild(frame);

    const frameDoc = frame.contentWindow?.document || frame.contentDocument;
    if (!frameDoc) {
      window.print();
      return;
    }

    const printStyles = `
      @import url('https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,600;0,700;0,800;1,400&display=swap');
      
      @page {
        size: A4 portrait;
        margin: 15mm 15mm 15mm 15mm;
      }

      * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }

      body {
        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.6;
        color: #0f172a;
        background: #ffffff;
        margin: 0;
        padding: 0;
      }

      h1, h2, h3, h4, h5, h6 {
        margin: 0;
        color: #0f172a;
      }

      p {
        margin-top: 0;
        margin-bottom: 0.5rem;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 6px 8px;
        text-align: left;
      }

      .text-center { text-align: center; }
      .text-right { text-align: right; }
      .text-justify { text-align: justify; text-justify: inter-word; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-mono { font-family: monospace; }
      .indent-8 { text-indent: 2.5rem; }
      
      .border { border: 1px solid #cbd5e1; }
      .border-b { border-bottom: 1px solid #cbd5e1; }
      .border-b-2 { border-bottom: 2px solid #0f172a; }
      .border-t { border-top: 1px solid #cbd5e1; }
      .border-t-2 { border-top: 2px solid #0f172a; }

      .grid-signatures {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 16px;
        text-align: center;
        font-size: 11px;
        margin-top: 30px;
        padding-top: 20px;
        border-top: 1px dashed #cbd5e1;
        page-break-inside: avoid;
      }

      .signature-box {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        min-height: 75px;
      }

      @media print {
        body {
          margin: 0;
          padding: 0;
        }
      }
    `;

    frameDoc.open();
    frameDoc.write(`
      <!DOCTYPE html>
      <html lang="th">
        <head>
          <meta charset="UTF-8">
          <title>${title}</title>
          <style>${printStyles}</style>
        </head>
        <body>
          ${htmlBody}
        </body>
      </html>
    `);
    frameDoc.close();

    // Trigger print after iframe renders
    setTimeout(() => {
      try {
        if (frame?.contentWindow) {
          frame.contentWindow.focus();
          frame.contentWindow.print();
        } else {
          window.print();
        }
      } catch (err) {
        console.warn('Iframe print error, falling back to window.print', err);
        window.print();
      }
    }, 400);
  } catch (error) {
    console.error('Print failed, falling back', error);
    window.print();
  }
}

/**
 * Generate full HTML for Lease Contract A4 Document
 */
export function generateContractHtml(
  contract: LeaseContract, 
  property: PropertyProfile, 
  room?: Room
): string {
  const clausesHtml = contract.rulesAndClauses
    .map((rule, idx) => `<li style="margin-bottom: 6px; text-align: justify;">${rule}</li>`)
    .join('');

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 10px 20px; font-family: 'Sarabun', sans-serif;">
      <!-- Contract Header -->
      <div style="text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px;">
        <h2 style="font-size: 20px; font-weight: 800; letter-spacing: -0.5px; margin: 0 0 4px 0;">หนังสือสัญญาเช่าห้องพัก</h2>
        <div style="font-size: 14px; font-weight: 600; color: #334155; margin-bottom: 4px;">
          ${contract.buildingName || property.name}
        </div>
        <div style="font-size: 11px; color: #64748b;">
          เลขที่สัญญา: <strong style="color: #0f172a; font-family: monospace; font-size: 13px;">${contract.contractNumber}</strong>
        </div>
      </div>

      <!-- Contract Info -->
      <div style="display: flex; justify-content: space-between; margin-bottom: 14px; font-size: 12px; color: #334155; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
        <div>
          สถานที่ทำสัญญา: <strong>${contract.contractPlace || property.name}</strong>
        </div>
        <div>
          ทำสัญญา ณ วันที่: <strong>${formatDateThai(contract.contractDate)}</strong>
        </div>
      </div>

      <!-- Parties -->
      <div style="line-height: 1.7; font-size: 12.5px; color: #1e293b; text-align: justify; margin-bottom: 12px;">
        <p style="text-indent: 2rem; margin-bottom: 6px;">
          สัญญาฉบับนี้ทำขึ้นระหว่าง <strong>${contract.lessorName}</strong> 
          ${contract.lessorIdCard ? `(เลขบัตรประจำตัวประชาชน ${contract.lessorIdCard})` : ''} 
          ที่อยู่ ${contract.lessorAddress || property.address} โทรศัพท์ ${contract.lessorPhone || property.phone} 
          ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้ให้เช่า"</strong> ฝ่ายหนึ่ง กับ
        </p>

        <p style="text-indent: 2rem; margin-bottom: 8px;">
          <strong>${contract.lesseeName}</strong> 
          ${contract.lesseeIdCard ? `(เลขบัตรประจำตัวประชาชน ${contract.lesseeIdCard})` : ''} 
          ที่อยู่ตามทะเบียนบ้าน ${contract.lesseeAddress || '-'} โทรศัพท์ <strong>${contract.lesseePhone || '-'}</strong> 
          ${contract.lesseeEmergencyContact ? `(บุคคลติดต่อฉุกเฉิน: ${contract.lesseeEmergencyContact})` : ''} 
          ซึ่งต่อไปในสัญญานี้เรียกว่า <strong>"ผู้เช่า"</strong> อีกฝ่ายหนึ่ง
        </p>

        <p style="text-indent: 2rem; font-weight: 600; margin-top: 10px; margin-bottom: 8px;">
          คู่สัญญาทั้งสองฝ่ายได้ตกลงทำสัญญากันโดยมีข้อความและเงื่อนไขดังต่อไปนี้:
        </p>

        <!-- Terms List -->
        <div style="padding-left: 8px;">
          <p style="margin-bottom: 6px;">
            <strong>ข้อ 1. ทรัพย์สินที่เช่า:</strong> ผู้ให้เช่าตกลงให้เช่า และผู้เช่าตกลงเช่าห้องพัก <strong>ห้องเลขที่ ${contract.roomNumber}</strong> ${room ? `ชั้นที่ ${room.floor} ประเภท ${room.type}` : ''} ภายในอาคาร ${contract.buildingName || property.name} เพื่อใช้เป็นที่อยู่อาศัยเท่านั้น
          </p>

          <p style="margin-bottom: 6px;">
            <strong>ข้อ 2. ระยะเวลาการเช่า:</strong> สัญญานี้มีกำหนดระยะเวลา <strong>${contract.durationMonths} เดือน</strong> เริ่มต้นตั้งแต่วันที่ <strong>${formatDateThai(contract.startDate)}</strong> ถึงวันที่ <strong>${contract.endDate ? formatDateThai(contract.endDate) : 'ครบกำหนดสัญญา'}</strong>
          </p>

          <p style="margin-bottom: 6px;">
            <strong>ข้อ 3. อัตราค่าเช่าและการชำระเงิน:</strong> ผู้เช่าตกลงชำระค่าเช่าในอัตราเดือนละ <strong>${formatCurrency(contract.monthlyRent)}</strong> (${contract.monthlyRent.toLocaleString('th-TH')} บาทถ้วน) โดยต้องชำระล่วงหน้าภายในวันที่ <strong>${contract.paymentDueDay}</strong> ของทุกเดือน
          </p>

          <p style="margin-bottom: 6px;">
            <strong>ข้อ 4. เงินประกันความเสียหายและค่าเช่าล่วงหน้า:</strong> ในวันทำสัญญานี้ ผู้เช่าได้วางเงินประกันความเสียหายเป็นจำนวนเงิน <strong>${formatCurrency(contract.depositAmount)}</strong> และค่าเช่าล่วงหน้า 1 เดือน เป็นเงิน <strong>${formatCurrency(contract.advanceRentAmount || contract.monthlyRent)}</strong> ให้แก่ผู้ให้เช่าเรียบร้อยแล้ว โดยผู้ให้เช่าจะคืนเงินประกันให้แก่ผู้เช่าเมื่อสิ้นสุดสัญญาและตรวจรับห้องพักเรียบร้อยแล้ว
          </p>

          <p style="margin-bottom: 6px;">
            <strong>ข้อ 5. ค่าน้ำประปา ค่าไฟฟ้า และค่าบริการส่วนกลาง:</strong> ผู้เช่าตกลงชำระตามอัตราที่กำหนด ได้แก่ ค่าน้ำประปา ${contract.waterRateText || '18 บาท/หน่วย'}, ค่าไฟฟ้า ${contract.elecRateText || '8 บาท/หน่วย'} ${contract.commonFeeMonthly ? `, ค่าส่วนกลาง ${formatCurrency(contract.commonFeeMonthly)}/เดือน` : ''}
          </p>

          <!-- Rules -->
          <div style="margin-top: 8px; margin-bottom: 8px;">
            <p style="font-weight: 700; margin-bottom: 4px;"><strong>ข้อ 6. ข้อกำหนดและระเบียบการพักอาศัย:</strong></p>
            <ol style="margin: 0; padding-left: 24px; color: #334155;">
              ${clausesHtml}
            </ol>
          </div>

          ${contract.specialConditions ? `
            <p style="margin-top: 8px; margin-bottom: 6px;">
              <strong>ข้อ 7. เงื่อนไขและข้อตกลงพิเศษ:</strong> ${contract.specialConditions}
            </p>
          ` : ''}
        </div>

        <p style="text-indent: 2rem; margin-top: 14px; margin-bottom: 8px;">
          สัญญานี้ทำขึ้นเป็นสองฉบับมีข้อความถูกต้องตรงกัน คู่สัญญาได้อ่านและเข้าใจข้อความโดยตลอดแล้ว จึงได้ลงลายมือชื่อไว้เป็นสำคัญต่อหน้าพยาน
        </p>
      </div>

      <!-- Signatures -->
      <div style="margin-top: 24px; padding-top: 16px; border-top: 1px dashed #94a3b8; display: flex; justify-content: space-between; text-align: center; font-size: 11px; color: #475569;">
        <div style="flex: 1; padding: 0 8px;">
          <div style="margin-bottom: 36px;">ลงชื่อ......................................................ผู้ให้เช่า</div>
          <div>( ${contract.lessorSignatureName || contract.lessorName} )</div>
        </div>

        <div style="flex: 1; padding: 0 8px;">
          <div style="margin-bottom: 36px;">ลงชื่อ......................................................ผู้เช่า</div>
          <div>( ${contract.lesseeSignatureName || contract.lesseeName} )</div>
        </div>

        <div style="flex: 1; padding: 0 8px;">
          <div style="margin-bottom: 36px;">ลงชื่อ......................................................พยาน</div>
          <div>( ${contract.witnessName1 || 'เจ้าหน้าที่นิติบุคคล'} )</div>
        </div>

        <div style="flex: 1; padding: 0 8px;">
          <div style="margin-bottom: 36px;">ลงชื่อ......................................................พยาน</div>
          <div>( ${contract.witnessName2 || 'พยาน'} )</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Print by DOM Element ID directly with iframe sandbox fallback
 */
export function printElementById(elementId: string, title: string): boolean {
  const element = document.getElementById(elementId);
  if (!element) {
    window.print();
    return false;
  }

  const htmlContent = element.outerHTML;
  printHtmlContent(title, htmlContent);
  return true;
}

/**
 * Generate full HTML for Invoice / Receipt A4 Document
 */
export function generateInvoiceHtml(
  bill: UtilityBill,
  property: PropertyProfile,
  billSeqNumber: number = 1,
  roomBillsCount: number = 1
): string {
  const isPaid = bill.paymentStatus === 'paid';
  const remaining = Math.max(0, bill.grandTotal - (bill.paidAmount || 0));

  return `
    <div style="max-width: 800px; margin: 0 auto; padding: 15px 25px; font-family: 'Sarabun', sans-serif;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 22px; font-weight: 800; margin: 0; color: #0f172a;">${property.name}</h2>
          <div style="font-size: 11px; color: #64748b; margin-top: 2px;">${property.nameEn || ''}</div>
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">${property.address}</div>
          <div style="font-size: 11px; color: #475569;">โทร: <strong>${property.phone}</strong> | เลขประจำตัวผู้เสียภาษี: ${property.taxId || '-'}</div>
        </div>
        <div style="text-align: right;">
          <div style="display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 12px; font-weight: 700; background: ${isPaid ? '#dcfce7; color: #166534;' : '#e0e7ff; color: #3730a3;'}">
            ${isPaid ? 'ใบเสร็จรับเงิน (RECEIPT)' : 'ใบแจ้งหนี้ (INVOICE)'}
          </div>
          <div style="font-size: 12px; color: #475569; margin-top: 6px;">เลขที่บิล: <strong style="color: #0f172a; font-family: monospace;">${bill.billNumber}</strong></div>
          <div style="font-size: 12px; color: #475569;">ประจำเดือน: <strong>${bill.monthYear}</strong></div>
          <div style="font-size: 11px; color: #475569;">วันที่ออกบิล: ${formatDateThai(bill.billingDate)}</div>
          <div style="font-size: 11px; color: #e11d48; font-weight: 700;">กำหนดชำระ: ${formatDateThai(bill.dueDate)}</div>
        </div>
      </div>

      <!-- Tenant & Room Box -->
      <div style="display: flex; justify-content: space-between; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 16px; font-size: 12px;">
        <div>
          <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">ผู้เช่าพัก</span>
          <div style="font-size: 14px; font-weight: 700; color: #0f172a; margin-top: 2px;">${bill.tenantName}</div>
          <div style="color: #475569;">โทรศัพท์: ${bill.tenantPhone || '-'}</div>
        </div>
        <div style="text-align: right;">
          <span style="font-size: 10px; color: #64748b; text-transform: uppercase;">ข้อมูลห้องพัก</span>
          <div style="font-size: 16px; font-weight: 800; color: #1e1b4b; margin-top: 2px;">ห้อง ${bill.roomNumber}</div>
          <div style="font-size: 10px; color: #64748b;">บิลลำดับที่ ${billSeqNumber} / ทั้งหมด ${roomBillsCount} บิล</div>
        </div>
      </div>

      <!-- Items Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
        <thead>
          <tr style="border-bottom: 2px solid #0f172a; background: #f1f5f9; text-align: left;">
            <th style="padding: 8px; width: 30px;">#</th>
            <th style="padding: 8px;">รายการ</th>
            <th style="padding: 8px; text-align: center;">มิเตอร์เดิม</th>
            <th style="padding: 8px; text-align: center;">มิเตอร์ล่าสุด</th>
            <th style="padding: 8px; text-align: center;">จำนวนหน่วย</th>
            <th style="padding: 8px; text-align: right;">ราคา/หน่วย</th>
            <th style="padding: 8px; text-align: right;">จำนวนเงิน (บาท)</th>
          </tr>
        </thead>
        <tbody>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; color: #94a3b8;">1</td>
            <td style="padding: 8px; font-weight: 700;">ค่าเช่าห้องพักประจำเดือน (${bill.monthYear})</td>
            <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
            <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
            <td style="padding: 8px; text-align: center;">1 เดือน</td>
            <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.roomRentAmount)}</td>
            <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(bill.roomRentAmount)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; color: #94a3b8;">2</td>
            <td style="padding: 8px;">ค่าน้ำประปา</td>
            <td style="padding: 8px; text-align: center; font-family: monospace;">${bill.prevWaterMeter}</td>
            <td style="padding: 8px; text-align: center; font-family: monospace;">${bill.currWaterMeter}</td>
            <td style="padding: 8px; text-align: center; font-family: monospace; font-weight: 700; color: #0284c7;">${bill.waterUnits} หน่วย</td>
            <td style="padding: 8px; text-align: right; font-family: monospace;">${bill.waterRate}</td>
            <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(bill.waterAmount)}</td>
          </tr>
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 8px; color: #94a3b8;">3</td>
            <td style="padding: 8px;">ค่าไฟฟ้า</td>
            <td style="padding: 8px; text-align: center; font-family: monospace;">${bill.prevElecMeter}</td>
            <td style="padding: 8px; text-align: center; font-family: monospace;">${bill.currElecMeter}</td>
            <td style="padding: 8px; text-align: center; font-family: monospace; font-weight: 700; color: #d97706;">${bill.elecUnits} หน่วย</td>
            <td style="padding: 8px; text-align: right; font-family: monospace;">${bill.elecRate}</td>
            <td style="padding: 8px; text-align: right; font-family: monospace; font-weight: 700;">${formatCurrency(bill.elecAmount)}</td>
          </tr>
          ${bill.commonFee > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; color: #94a3b8;">4</td>
              <td style="padding: 8px;">ค่าบริการส่วนกลาง</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.commonFee)}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.commonFee)}</td>
            </tr>
          ` : ''}
          ${bill.internetFee > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; color: #94a3b8;">5</td>
              <td style="padding: 8px;">ค่าบริการอินเทอร์เน็ต WiFi</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.internetFee)}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.internetFee)}</td>
            </tr>
          ` : ''}
          ${bill.parkingFee > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; color: #94a3b8;">6</td>
              <td style="padding: 8px;">ค่าที่จอดรถ</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.parkingFee)}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.parkingFee)}</td>
            </tr>
          ` : ''}
          ${bill.trashFee > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; color: #94a3b8;">7</td>
              <td style="padding: 8px;">ค่าเก็บขยะ</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.trashFee)}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.trashFee)}</td>
            </tr>
          ` : ''}
          ${bill.otherFees > 0 ? `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 8px; color: #94a3b8;">8</td>
              <td style="padding: 8px;">${bill.otherFeesNote || 'ค่าใช้จ่ายอื่นๆ'}</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center; color: #94a3b8;">-</td>
              <td style="padding: 8px; text-align: center;">1</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.otherFees)}</td>
              <td style="padding: 8px; text-align: right; font-family: monospace;">${formatCurrency(bill.otherFees)}</td>
            </tr>
          ` : ''}
        </tbody>
      </table>

      <!-- Summary Box -->
      <div style="display: flex; justify-content: space-between; border-top: 2px solid #0f172a; padding-top: 12px; margin-bottom: 24px;">
        <div style="font-size: 11px; color: #475569; max-width: 320px;">
          <strong>ช่องทางการชำระเงิน:</strong><br />
          • ธนาคาร: ${property.bankName}<br />
          • เลขที่บัญชี: <strong style="color: #0f172a; font-family: monospace;">${property.bankAccount}</strong> (${property.bankAccountName})<br />
          • พร้อมเพย์: <strong style="color: #0f172a; font-family: monospace;">${property.promptPayId}</strong> (${property.promptPayName})
          ${bill.paidAmount && bill.paidAmount > 0 ? `
            <div style="margin-top: 8px; padding: 6px 10px; background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; color: #065f46;">
              ✓ รับชำระแล้ว: <strong style="font-family: monospace;">${formatCurrency(bill.paidAmount)}</strong> (${bill.paidMethod || 'โอนเงิน'})
            </div>
          ` : ''}
        </div>
        <div style="width: 260px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; font-size: 13px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #64748b;">
            <span>รวมเป็นเงิน:</span>
            <span style="font-family: monospace; font-weight: 600;">${formatCurrency(bill.subtotal)}</span>
          </div>
          ${bill.discount > 0 ? `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; color: #e11d48;">
              <span>ส่วนลด:</span>
              <span style="font-family: monospace; font-weight: 600;">-${formatCurrency(bill.discount)}</span>
            </div>
          ` : ''}
          <div style="display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; font-weight: 800; font-size: 15px; color: #0f172a;">
            <span>ยอดชำระสุทธิ:</span>
            <span style="font-family: monospace; color: #1e1b4b;">${formatCurrency(bill.grandTotal)}</span>
          </div>
          ${bill.paidAmount && bill.paidAmount > 0 ? `
            <div style="border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 6px; font-size: 11px;">
              <div style="display: flex; justify-content: space-between; color: #059669; font-weight: 700;">
                <span>ชำระแล้ว:</span>
                <span style="font-family: monospace;">${formatCurrency(bill.paidAmount)}</span>
              </div>
              <div style="display: flex; justify-content: space-between; color: #475569; margin-top: 2px;">
                <span>คงเหลือ:</span>
                <span style="font-family: monospace; font-weight: 700; color: ${remaining > 0 ? '#e11d48' : '#059669'};">${formatCurrency(remaining)}</span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Signatures -->
      <div style="display: flex; justify-content: space-around; text-align: center; font-size: 11px; color: #64748b; margin-top: 30px; padding-top: 16px; border-top: 1px dashed #cbd5e1;">
        <div style="width: 200px;">
          <div style="margin-bottom: 30px;">ผู้รับเงิน / ผู้ดูแลหอพัก</div>
          <div>( ${property.bankAccountName || property.name} )</div>
        </div>
        <div style="width: 200px;">
          <div style="margin-bottom: 30px;">ผู้เช่าพัก / ผู้ชำระเงิน</div>
          <div>( ${bill.tenantName} )</div>
        </div>
      </div>
    </div>
  `;
}

/**
 * Download HTML document as standalone file
 */
export function downloadHtmlFile(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


