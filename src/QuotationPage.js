import React, {useState, useEffect, useRef} from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './styles.css';
import ExcelJS from 'exceljs';

const QuotationPage = () => {
    const [selectedContact, setSelectedContact] = useState({
        name: 'Dennis Ding',
        tel: '13774297543'
    });
    const [tableData, setTableData] = useState([]);
    const [options, setOptions] = useState([]); // API 返回的选项
    const [selectedOptions, setSelectedOptions] = useState([
        { mainCategory: "", selectedItems: [], quantity: new Map(), subTotal:0},
    ]);
    const [tableShowIndexes, setTableShowIndexes] = useState(new Set());
    const [modalData, setModalData] = useState({
        category: '',
        index: null,
        visible: false,
        selectedItems: []
    });

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const options = ["Main Hoist", "Disc brake SB 30-BL550-8"];
                const response = await fetch("http://127.0.0.1:8080/demo/option", {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(options),
                });

                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }

                const data = await response.json();
                setOptions(data);
            } catch (error) {
                console.error('Error fetching options:', error);
            }
        };

        fetchOptions().then(r => r);
    }, []);

    const handleMainCategoryChange = (event, index) => {
        const selectedCategory = event.target.value;
        const quantity = new Map();

        if (selectedCategory === "") {
            setSelectedOptions((prevOptions) =>
                prevOptions.filter((_, i) => i !== index)
            );
        } else {
            setSelectedOptions((prevOptions) => {
                const updatedOptions = [...prevOptions];
                updatedOptions[index] = {
                    mainCategory: selectedCategory,
                    selectedItems: options[selectedCategory] || [],
                    quantity: options[quantity] || [],
                };
                return updatedOptions;
            });
            openSubCategoryModal(selectedCategory, index);
        }
    };

    const openSubCategoryModal = (category, index) => {
        setModalData({
            category,
            index,
            visible: true,
            selectedItems: []
        });
    };

    const handleDeleteRow = (deleteIndex) => {
        setSelectedOptions((prevOptions) =>
            prevOptions.filter((_, i) => i !== deleteIndex)
        );

        setTableShowIndexes((prevIndexes) => {
            const updatedIndexes = new Set(prevIndexes);
            updatedIndexes.delete(deleteIndex); // 移除该行索引
            return updatedIndexes;
        });

        setIndividualCost((prevCosts) => {
            const updatedCosts = new Map(prevCosts); // 创建 Map 的副本
            if (updatedCosts.has(index)) {
                updatedCosts.delete(index); // 删除指定的 key
                console.log("After Deletion:", Array.from(updatedCosts.entries()));
            } else {
                console.warn(`Key ${index} not found in individualCost.`);
            }
            return updatedCosts;
        });

    };


    useEffect(() => {
        console.log("Modal data updated:", modalData);

    }, [modalData]);

    const handleDescriptionSelection = () => {
        setTableShowIndexes((prevIndexes) => {
            const updatedIndexes = new Set(prevIndexes);
            updatedIndexes.add(modalData.index);
            return updatedIndexes;
        });
        setSelectedOptions((prevOptions) => {
            const updatedOptions = [...prevOptions];
            updatedOptions[modalData.index].selectedItems = modalData.selectedItems;
            return updatedOptions;
        });
        setModalData({category: '', index: null, visible: false, selectedItems: []});
    };

    const handleModalCheckboxChange = (event) => {
        const {checked, value} = event.target;
        setModalData((prevModalData) => {
            const selectedItems = prevModalData.selectedItems || [];
            return {
                ...prevModalData,
                selectedItems: checked
                    ? [...selectedItems, value]
                    : selectedItems.filter((item) => item !== value),
            };
        });
    };

    const handleAddRow = () => {
        setSelectedOptions([...selectedOptions, ""]);
    };

    const contacts = [
        {name: 'Dennis Ding', tel: '13774297543'},
        {name: 'Alice Zhang', tel: '13987654321'},
        {name: 'Bob Lee', tel: '13612345678'}
    ];

    const handleContactChange = (event) => {
        const selectedName = event.target.value;
        const contact = contacts.find(contact => contact.name === selectedName);
        setSelectedContact(contact);
    };

    const pageRef = useRef(null); // 引用整个页面
    const handleQuantityChange = async (mainCategory, itemName, value,rowId,ID) => {
        // 更新数量
        setSelectedOptions((prevOptions) => {
            const updatedOptions = [...prevOptions];
            updatedOptions.forEach((option) => {
                if (option.mainCategory === mainCategory) {
                    option.selectedItems.forEach((item) => {
                        if (item.name === itemName) {
                            item.quantity = Number(value);
                        }
                    });
                }
            });
            return updatedOptions;
        });
        // 构造正确的请求参数
        const payload = {
            customerType: "B客户",
            products: [
                {
                    mainProduct: mainCategory,
                    option:  itemName,
                    quantity:value,
                },
            ],
        };

        try {
            const response = await fetch("http://127.0.0.1:8080/demo/quote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch data from backend");
            }

            const result = await response.json();

            // 处理返回数据
            const newTotalCost = new Map();
            const { products, totalCost } = result;

            if (totalCost !== 0) {
                newTotalCost.set(products[0].mainProduct, totalCost); // 更新总价
            }

            products.forEach(({ subTotal }) => {
                if(individualCost.has(rowId)) {
                    individualCost.get(rowId)[ID] =subTotal
                    const currentArray = individualCost.get(rowId);
                    currentArray[ID] = subTotal; // 更新指定 ID 的值
                    sum[rowId] = currentArray.reduce((acc, value) => acc + value, 0);
                }
                else individualCost.set(rowId,[subTotal]);
            });
            setSum(sum);
            setIndividualCost(individualCost);
            setTotalCost(newTotalCost);
        } catch (error) {
            console.error("Error sending data to backend:", error);
        }
    };

    const preparePayload = () => {
        return {
            customerType: "B客户",
            products: selectedOptions.flatMap((option) => {
                const mainProductRow = {
                    mainProduct: option.mainCategory,
                    option: "",
                    quantity: 0,
                };

                const optionRows = [];
                if (option.quantity && Object.keys(option.quantity).length > 0) {
                    for (const [key, value] of Object.entries(option.quantity)) {
                        optionRows.push({
                            mainProduct: option.mainCategory,
                            option: key,
                            quantity: value.quantity,
                        });
                    }
                }
                return [mainProductRow, ...optionRows];
            }),
        };
    };

    const [totalCost, setTotalCost] = useState(new Map());
    const [individualCost, setIndividualCost] = useState(
        new Map([
            [0, [0]],
        ])
    );
    const [sum,setSum] = useState([]);

    const sendDataToBackend = async () => {
        const payload = preparePayload();
        try {
            const response = await fetch("http://127.0.0.1:8080/demo/quote", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch data from backend");
            }

            const result = await response.json();
            const newTotalCost = new Map();
            const { products, totalCost } = result;
            const individualCost = [];
            if (totalCost !== 0) { // Filter out zero totals
                newTotalCost.set(products[0].mainProduct, totalCost);
            }
            products.forEach(({ mainProduct, subTotal }) => {
                individualCost.push(mainProduct, subTotal);
            });
            setTotalCost(newTotalCost);
        } catch (error) {
            console.error("Error sending data to backend:", error);
        }
    }
    useEffect(() => {
        const storedTotalCost = localStorage.getItem("totalCost");
        if (storedTotalCost) {
           console.log(true)
        }
    }, []);

    useEffect(() => {
        if (selectedOptions.length > 0 && selectedOptions[0].quantity!==[] && selectedOptions[0].mainCategory) {
            const payload = preparePayload();
            sendDataToBackend().then(r => r);
            console.log("Updated Payload:", payload);
        }
    }, [selectedOptions]); // 监听 selectedOptions 的变化
    let index = 0;
    useEffect(() => {
        index++;
        Object.entries(totalCost).forEach(([key, value]) => {
            localStorage.setItem(`totalCost-${key}`, JSON.stringify(value));
        });
    }, [totalCost]);

    // 📄 导出为 PDFUnit price
    const exportToPDF = () => {
        const input = pageRef.current;
        html2canvas(input, {scale: 2}).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4'); // A4 纸张，纵向
            const imgWidth = 210; // A4 页面宽度
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            let position = 0;
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            pdf.save('quotation.pdf');
        });
    };
    const tableRef = useRef(null);
    // 📊 导出为 Excel
    // 🛠️ 导出 Excel 优化后的样式
    useEffect(() => {
        console.log("Updated tableData:", tableData);
    }, [tableData]);

    const exportToExcel = () => {
        if (tableRef.current) {
            const rows = tableRef.current.querySelectorAll("tr");

            const extractedData = Array.from(rows).map((row) => {
                const cells = row.querySelectorAll("td, th");
                return Array.from(cells).map((cell) => {
                    const select = cell.querySelector("select");
                    if (select) {
                        // 如果是默认选项，返回空字符串
                        return select.value === "" ? "" : select.options[select.selectedIndex].text;
                    }
                    const input = cell.querySelector("input");
                    return input ? input.value.trim() : cell.innerText.trim();
                });
            });
            extractedData.filter((row) => row.some((cell) => cell !== ""));
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Quotation');

            let currentRow = 2; // 动态跟踪当前行

            // ✅ 标题部分
            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = 'DELLNER BUBENZER Germany GmbH';
            worksheet.getCell(`A${currentRow}`).font = {size: 14, bold: true};
            worksheet.getCell(`A${currentRow}`).alignment = {horizontal: 'center'};

            currentRow++;
            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = 'QUOTATION';
            worksheet.getCell(`A${currentRow}`).font = {size: 14, bold: true};
            worksheet.getCell(`A${currentRow}`).alignment = {horizontal: 'center'};

            currentRow += 2;

            // ✅ 公司和客户信息
            worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = 'To: Shanghai Zhenhua Heavy Industries Company Limited';
            worksheet.getCell(`A${currentRow}`).font = {bold: true};
            worksheet.getCell(`A${currentRow}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {argb: 'FFFF00'},
            };

            currentRow++;
            worksheet.mergeCells(`A${currentRow}:C${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = 'Address: 3261 Dong Fang Road, 200125 SHANGHAI, P.R. CHINA';
            worksheet.getCell(`A${currentRow}`).font = {bold: true};
            worksheet.getCell(`A${currentRow}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {argb: 'FFFF00'},
            };

            worksheet.getCell(`D${currentRow - 1}`).value = 'Quotation no.:';
            worksheet.getCell(`E${currentRow - 1}`).value = 'DBCN-QAD-820076515';

            worksheet.getCell(`D${currentRow}`).value = 'Contact Person:';
            worksheet.getCell(`E${currentRow}`).value = 'DORIS SONG';

            currentRow++;
            worksheet.getCell(`D${currentRow}`).value = 'Tel:';
            worksheet.getCell(`E${currentRow}`).value = '1391739681';

            currentRow++;
            worksheet.getCell(`D${currentRow}`).value = 'Date:';
            worksheet.getCell(`E${currentRow}`).value = '2024/12/31';
            worksheet.getCell(`E${currentRow}`).font = {color: {argb: 'FF0000'}};

            currentRow += 2;

            // ✅ Terms 部分（aligned-terms）
            const termsData = [
                ['Terms of delivery:', 'CFR Shanghai'],
                ['Shipping type:', 'Seafreight'],
                ['Terms of payment:', 'irrevocable letter of credit at sight'],
                ['Validity of prices:', '2025/1/8'],
                ['Delivery time:', '13-14 weeks after receipt of your order and after complete technical clarification'],
            ];

            termsData.forEach(([label, value]) => {
                worksheet.getCell(`A${currentRow}`).value = label;
                worksheet.getCell(`A${currentRow}`).font = {bold: true};
                worksheet.getCell(`A${currentRow}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: {argb: 'FFFFCC'},
                };

                worksheet.mergeCells(`B${currentRow}:E${currentRow}`);
                worksheet.getCell(`B${currentRow}`).value = value;
                worksheet.getCell(`B${currentRow}`).alignment = {wrapText: true};
                currentRow++;
            });

            currentRow += 2;
            const paragraph =
                'This quotation is based on the Dellner Bubenzer General Terms and Conditions of Sale available at www.dellnerbubenzer.com/company/certifications.';

            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = paragraph;
            worksheet.getCell(`A${currentRow}`).alignment = {wrapText: true, vertical: 'top'};
            worksheet.getCell(`A${currentRow}`).font = {size: 11};
            worksheet.getCell(`A${currentRow}`).border = {
                top: {style: 'thin'},
                bottom: {style: 'thin'},
                left: {style: 'thin'},
                right: {style: 'thin'},
            };

            // ✅ 动态计算行高
            const approximateCharsPerLine = 70; // 每行大约70个字符（根据列宽调整）
            const totalChars = paragraph.length; // 总字符数
            const lineBreaks = paragraph.split('\n').length; // 计算换行符数量
            const estimatedLineCount = Math.ceil(totalChars / approximateCharsPerLine) + lineBreaks;

            // 设置行高（每行大约15像素）
            worksheet.getRow(currentRow).height = estimatedLineCount * 8;
            currentRow += 1;
            const content = [
                'We hereby bar the buyer/distributor from deliver, sale, export, re-export the goods provided by us and listed in Annexes XI, XX, XXXV, XL in accordance with Art. 12g of Regulation (EU) 833/2014.',
                'The buyer/distributor is obligated to undertake the necessary to introduce as well as to follow up a proper monitoring mechanisms to ensure that bypassing of the requirements of Art. 12g by third parties in the supply chain will be excluded.',
                '- Withdraw from the contract',
                '- Damages in the amount of 50% of the contract value',
                '- Immediate termination of the business relationship',
                'The buyer/distributor is obligated to inform the seller immediately as soon as he becomes aware of any information about possible offences by third parties.',
            ];

            const combinedContent = content
                .map((text) => (text.startsWith('-') ? `• ${text.substring(1)}` : text))
                .join('\n');

            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            worksheet.getCell(`A${currentRow}`).value = combinedContent;
            worksheet.getCell(`A${currentRow}`).alignment = {wrapText: true, vertical: 'top'};
            worksheet.getCell(`A${currentRow}`).font = {size: 11};
            const lineCount = combinedContent.split('\n').length;
            worksheet.getRow(currentRow).height = lineCount * 15;
            worksheet.getCell(`A${currentRow}`).border = {
                top: {style: 'thin'},
                bottom: {style: 'thin'},
                left: {style: 'thin'},
                right: {style: 'thin'},
            };

            currentRow += 2;

            // ✅ 表格部分
            worksheet.addRow(['Item', 'Description', 'Unit price / EUR', 'Qty./PC', 'Total / EUR']);
            worksheet.getRow(currentRow).font = {bold: true};
            worksheet.getRow(currentRow).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: {argb: 'FFFF00'},
            };
            const maxColumns = extractedData.reduce((max, row) => Math.max(max, row.length), 0);

            // 对齐列数
            const alignedData = extractedData.map((row) => {
                while (row.length < maxColumns) {
                    row.push(""); // 添加空字符串填充
                }
                return row;
            });

            // 设置列宽和行高
            for (let i = 1; i <= maxColumns; i++) {
                worksheet.getColumn(i).width = 20; // 设置列宽为 20
            }
            alignedData.forEach((row, index) => {
                worksheet.getRow(index + 1).height = 25; // 设置行高为 25
            });

            // 添加行并设置样式
            alignedData.forEach((row) => {
                worksheet.addRow(row).eachCell((cell) => {
                    cell.alignment = {wrapText: true};
                    cell.border = {
                        top: {style: 'thin'},
                        bottom: {style: 'thin'},
                        left: {style: 'thin'},
                        right: {style: 'thin'},
                    };
                });
            });

            currentRow += 50;
            const technicalSpecifications = {
                'Disc brake SB28.5-BL450-8': [
                    '- automatic wear compensator',
                    '- self centering device with cam disc and roller',
                    '- adjustable brake spring',
                    '- proximity switch for brake release (Normal Open, IFM 24VDC~230VAC)',
                    '- manual release handle',
                    '- lining: 02/sintered',
                    '- connection bolts A4',
                    '- self lubricating bushings',
                    '- weather execution',
                    'temperature range: -20°C to +50°C (+70°C depending on thruster)',
                    'colour: RAL 3004, DFT 80 μm',
                ],
                'BUEL Thruster BL 450-8, TRIAC-circuit board': [
                    'temperature range: -30°C bis +60°C',
                    'increased corrosion protection',
                    'Supply Voltage: 480V, 3ph, 60HZ',
                    'colour: RAL 9005; DFT: 120μm',
                ],
            };

            worksheet.getCell(`A${currentRow}`).value = 'Technical Specification';
            worksheet.getCell(`A${currentRow}`).font = {size: 14, bold: true};
            worksheet.getCell(`A${currentRow}`).alignment = {horizontal: 'center'};
            worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
            currentRow++;

            // 遍历技术规格部分，动态添加到 Excel
            Object.entries(technicalSpecifications).forEach(([title, details]) => {
                worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
                worksheet.getCell(`A${currentRow}`).value = title;
                worksheet.getCell(`A${currentRow}`).font = {bold: true};
                currentRow++;

                details.forEach((detail) => {
                    worksheet.mergeCells(`A${currentRow}:E${currentRow}`);
                    worksheet.getCell(`A${currentRow}`).value = detail;
                    worksheet.getCell(`A${currentRow}`).alignment = {wrapText: true};
                    currentRow++;
                });

                currentRow++; // 空一行
            });

            // ✅ 导出文件
            workbook.xlsx.writeBuffer().then((buffer) => {
                const blob = new Blob([buffer], {
                    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                });
                const link = document.createElement('a');
                link.href = URL.createObjectURL(blob);
                link.download = 'quotation_fixed.xlsx';
                link.click();
                URL.revokeObjectURL(link.href);
            });
        }
    };
    const [data, setData] = useState([]); // 保存描述信息

    // 获取描述数据
    const fetchDescription = async () => {
        try {
            const response = await fetch("http://127.0.0.1:8080/demo/desc", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(["Main Hoist", "Disc brake SB 30-BL550-8"]),
            });

            if (!response.ok) {
                throw new Error("Failed to fetch description");
            }

            const result = await response.json();
            console.log(result)
            setData((prevData) => [...prevData, result]);
        } catch (error) {
            console.error("Error fetching description:", error);
        }
    };


    return (
        <div>
            <div className="quotation-container" ref={pageRef}>
                {/* 标题 */}
                <div className="header">
                    <h1>DELLNER BUBENZER <span className="bold">Germany GmbH</span></h1>
                    <hr/>
                    <h2 className="sub-header">QUOTATION</h2>
                </div>

                {/* 左右分区 */}
                <div className="quotation-details">
                    <div className="left-section">
                        <p>
                            <span
                                className="limited-width bold">To:Shanghai Zhenhua Heavy Industries Company Limited</span>
                        </p>

                        <p>
                            <div className="limited-width bold">Address:
                                <span className="bold">3261 Dong Fang Road</span><br/>
                                <span className="bold">200125 SHANGHAI, P.R. CHINA</span>
                            </div>
                        </p>

                        {/* 空行 */}
                        <div className="spaced-line"></div>

                        <div className="aligned-terms">
                            <div className="term-row">
                                <span className="term-label">Terms of delivery:</span>
                                <span className="term-value">CFR Shanghai</span>
                            </div>
                            <div className="term-row">
                                <span className="term-label">Shipping type:</span>
                                <span className="term-value">Seafreight</span>
                            </div>
                            <div className="term-row">
                                <span className="term-label">Terms of payment:</span>
                                <span className="term-value">irrevocable letter of credit at sight</span>
                            </div>
                            <div className="term-row">
                                <span className="term-label">Validity of prices:</span>
                                <span className="term-value">2025/1/8</span>
                            </div>
                            <div className="term-row">
                                <span className="term-label">Delivery time:</span>
                                <span className="term-value">13-14 weeks after receipt of your order and after complete technical clarification</span>
                            </div>
                        </div>

                    </div>
                    <div className="right-section">
                        <p><strong>Quotation no.:</strong> 820076435-R1</p>
                        <p>
                            <strong>Contact Person:</strong>
                            <select value={selectedContact.name} onChange={handleContactChange}>
                                {contacts.map((contact) => (
                                    <option key={contact.name} value={contact.name}>
                                        {contact.name}
                                    </option>
                                ))}
                            </select>
                        </p>
                        <p>
                            <strong>Tel:</strong> <span>{selectedContact.tel}</span>
                        </p>
                        <p><strong>Date:</strong> 2024/12/25</p>
                    </div>
                </div>

                {/* 条款说明 */}
                <div className="terms">
                    <p>
                        This quotation is based on the Dellner Bubenzer General Terms and Conditions of Sale which can
                        be found under
                        <a href="https://www.dellnerbubenzer.com/company/certifications"> www.dellnerbubenzer.com/company/certifications</a>.
                    </p>
                    <p>
                        We hereby bar the buyer/distributor from deliver, sale, export, re-export the goods provided by
                        us and listed in Annexes XI,
                        XX, XXXV, XL in accordance with Art. 12g of Regulation (EU) 833/2014.
                    </p>
                    <p>
                        The buyer/distributor is obligated to undertake the necessary to introduce as well as to follow
                        up a proper monitoring
                        mechanisms to ensure that bypassing of the requirements of Art. 12g by third parties in the
                        supply chain will be excluded.
                    </p>
                    <ul>
                        <li>Withdraw from the contract</li>
                        <li>Damages in the amount of 50% of the contract value</li>
                        <li>Immediate termination of the business relationship</li>
                    </ul>
                    <p>
                        The buyer/distributor is obligated to inform the seller immediately as soon as he becomes aware
                        of any information about
                        possible offences by third parties.
                    </p>
                </div>

                {/* 项目名称与折扣 */}
                <div className="project-details">
                    <p><strong>Project Name:</strong> <span className="bold">1002001367-TIL Brazil PNV 2xSTS</span></p>
                    <p><strong>R1:</strong> provide additional discount</p>
                    <div className="rowButton">
                        <button onClick={handleAddRow}>Add Row</button>
                        <button onClick={fetchDescription}>Show</button>
                    </div>
                </div>

                <table className="project-table" ref={tableRef}>
                    <thead>
                    <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>Unit price / EUR</th>
                        <th>Qty./PC</th>
                        <th>Total / EUR</th>
                    </tr>
                    </thead>
                    <tbody>
                    {modalData.visible && (
                        <>
                            <div className="modal-overlay" onClick={() => setModalData({
                                category: '',
                                index: null,
                                visible: false,
                                selectedItems: []
                            })}></div>
                            <div className="modal">
                                <h3>Select Items for {modalData.category}</h3>
                                <ul>
                                    {options[modalData.category]?.map((subCategory, i) => (
                                        <li key={i}>
                                            <input
                                                type="checkbox"
                                                id={`item-${i}`}
                                                value={subCategory}
                                                onChange={handleModalCheckboxChange}
                                            />
                                            <label htmlFor={`item-${i}`}>{subCategory}</label>
                                        </li>
                                    ))}
                                </ul>
                                <button onClick={handleDescriptionSelection}>Confirm</button>
                                <button onClick={() => setModalData({
                                    category: '',
                                    index: null,
                                    visible: false,
                                    selectedItems: []
                                })}>Cancel
                                </button>
                            </div>
                        </>
                    )}
                    {selectedOptions.map((option, index) => (
                        <React.Fragment key={index}>
                            <tr key={index}>
                                <td>{index + 1}</td>
                                <td>
                                    <select
                                        onChange={(event) => handleMainCategoryChange(event, index)}
                                        value={option.mainCategory || ""}
                                    >
                                        <option value="">Select a category</option>
                                        {Object.keys(options).map((key) => (
                                            <option key={key} value={key}>
                                                {key}
                                            </option>
                                        ))}
                                    </select>
                                    <button onClick={() => handleDeleteRow(index)}>Delete</button>
                                </td>
                                <td></td>
                                <td></td>
                                <td></td>
                            </tr>
                            {tableShowIndexes.has(index) && option?.selectedItems?.map((item, subIndex) => (
                                <tr key={`${item}-${index}`}>
                                    <td></td>
                                    <td>{item}</td>
                                    <td>
                                        <input
                                            type="number"
                                            placeholder="Unit Price"
                                        />
                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            onChange={(e) => handleQuantityChange(option.mainCategory, item, e.target.value,index,subIndex)}
                                        />

                                    </td>
                                    <td>
                                        <input
                                            type="number"
                                            placeholder="Total / EUR"
                                            value={individualCost.get(index)?.[subIndex] || "0.00"}
                                            readOnly
                                        />
                                    </td>
                                </tr>
                            ))}
                            {tableShowIndexes.has(index) && (
                                    <tr style={{ backgroundColor: "#d4edda" }}>
                                        <td colSpan="4" style={{ textAlign: "right", fontWeight: "bold",color: "red" }}>
                                            Total Amount for {option.mainCategory}
                                        </td>
                                        <td style={{ fontWeight: "bold", color: "red" }}>
                                            {sum[index]}
                                        </td>
                                    </tr>
                                )
                            }
                        </React.Fragment>
                    ))}
                    </tbody>
                </table>
                {data.length > 0 && (
                    <table border="1" style={{ width: "100%", marginTop: "20px", textAlign: "left" }}>
                        <thead>
                        <tr>
                            <th
                                colSpan="2"
                                style={{
                                    backgroundColor: "#FFFF00",
                                    fontWeight: "bold",
                                    textAlign: "center", // 水平居中
                                    verticalAlign: "middle", // 垂直居中
                                }}
                            >
                                Technical Specification
                            </th>
                        </tr>
                        </thead>
                        <tbody>
                        {data.map((item, index) =>
                            Object.entries(item).map(([key, value]) => (
                                <React.Fragment key={`${key}-${index}`}>
                                    <tr>
                                        <td colSpan="2" style={{ fontWeight: "bold" }}>{key}</td>
                                    </tr>
                                    {value.map((line, subIndex) => (
                                        <tr key={subIndex}>
                                            <td colSpan="2">{line}</td>
                                        </tr>
                                    ))}
                                </React.Fragment>
                            ))
                        )}
                        </tbody>
                    </table>
                )}
            </div>
            <div className="export-buttons">
                <button onClick={exportToPDF}>Export to PDF</button>
                <button onClick={exportToExcel}>Export to Excel</button>
            </div>
        </div>
    );
};

export default QuotationPage;
