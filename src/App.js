import React from 'react';
import './styles.css';

const QuotationPage = () => {
  return (
      <div className="quotation-container">
        {/* 标题 */}
        <div className="header">
          <h1>DELLNER BUBENZER <span className="bold">Germany GmbH</span></h1>
          <hr />
          <h2 className="sub-header">QUOTATION</h2>
        </div>

        {/* 左右分区 */}
        <div className="quotation-details">
          <div className="left-section">
            <p><strong>To:</strong></p>
            <p className="bold">Shanghai Zhenhua Heavy Industries Company Limited</p>
            <p><strong>Address:</strong></p>
            <p className="bold">3261 Dong Fang Road</p>
            <p className="bold">200125 SHANGHAI, P.R. CHINA</p>

            {/* 空行 */}
            <div className="spaced-line"></div>

            <p><strong>Terms of delivery:</strong> CFR Shanghai</p>
            <p><strong>Shipping type:</strong> Seafreight</p>
            <p><strong>Terms of payment:</strong> irrevocable letter of credit at sight</p>
            <p><strong>Validity of prices:</strong> 2025/1/8</p>
            <p><strong>Delivery time:</strong> 13-14 weeks after receipt of your order and after complete technical clarification</p>
          </div>
          <div className="right-section">
            <p><strong>Quotation no.:</strong> 820076435-R1</p>
            <p><strong>Contact Person:</strong> Dennis Ding</p>
            <p><strong>Tel:</strong> 13774297543</p>
            <p><strong>Date:</strong> 2024/12/25</p>
          </div>
        </div>

        {/* 条款说明 */}
        <div className="terms">
          <p>
            This quotation is based on the Dellner Bubenzer General Terms and Conditions of Sale which can be found under
            <a href="https://www.dellnerbubenzer.com/company/certifications"> www.dellnerbubenzer.com/company/certifications</a>.
          </p>
          <p>
            We hereby bar the buyer/distributor from deliver, sale, export, re-export the goods provided by us and listed in Annexes XI,
            XX, XXXV, XL in accordance with Art. 12g of Regulation (EU) 833/2014.
          </p>
          <p>
            The buyer/distributor is obligated to undertake the necessary to introduce as well as to follow up a proper monitoring
            mechanisms to ensure that bypassing of the requirements of Art. 12g by third parties in the supply chain will be excluded.
          </p>
          <ul>
            <li>Withdraw from the contract</li>
            <li>Damages in the amount of 50% of the contract value</li>
            <li>Immediate termination of the business relationship</li>
          </ul>
          <p>
            The buyer/distributor is obligated to inform the seller immediately as soon as he becomes aware of any information about
            possible offences by third parties.
          </p>
        </div>

        {/* 项目名称与折扣 */}
        <div className="project-details">
          <p><strong>Project Name:</strong> <span className="bold">1002001367-TIL Brazil PNV 2xSTS</span></p>
          <p><strong>R1:</strong> provide additional discount</p>
        </div>
      </div>
  );
};

export default QuotationPage;
