import React, {useContext, useEffect, useRef, useState} from 'react';
import {classNames} from 'primereact/utils';
import {DataTable} from 'primereact/datatable';
import {Column} from 'primereact/column';
import {Toast} from 'primereact/toast';
import {Button} from 'primereact/button';
import {Image} from 'primereact/image';
import {Toolbar} from 'primereact/toolbar';
import {RadioButton} from 'primereact/radiobutton';
import {Dialog} from 'primereact/dialog';
import {InputText} from 'primereact/inputtext';
import storage from "~/firebaseConfig";
import {getDownloadURL, ref, uploadBytesResumable} from "firebase/storage";


import * as productService from '~/services/productService'
import * as categoryService from "~/services/categoryService";
import {useNavigate} from "react-router-dom";
import AuthContext from "~/security/AuthContext";
import * as sizeService from "~/services/sizeService";
import * as colorService from "~/services/colorService";
import {Checkbox} from "primereact/checkbox";
import {MDBInputGroup, MDBTable, MDBTableBody, MDBTableHead} from "mdb-react-ui-kit";
import {Editor} from "primereact/editor";

const Products = () => {
    let newProduct = {
        name: '',
        image: null,
        description: '',
        category: {},
        variants: []
    };
    let newVariant = {
        name: '',
        price: '',
        quantity: '',
    }
    const [file, setFile] = useState('');
    const [productList, setProductList] = useState([]);
    const [categories, setCategories] = useState([]);
    const [sizes, setSizes] = useState([]);
    const [checkedSizes, setCheckedSizes] = useState([]);
    const [colors, setColors] = useState([]);
    const [checkedColors, setCheckedColors] = useState(() => [{...newVariant}]);
    const [productDialog, setProductDialog] = useState(false);
    const [deleteProductDialog, setDeleteProductDialog] = useState(false);
    const [deleteProductListDialog, setDeleteProductListDialog] = useState(false);
    const [product, setProduct] = useState(() => newProduct);
    const [selectedProductList, setSelectedProductList] = useState(null);
    const [submitted, setSubmitted] = useState(false);
    const [globalFilter, setGlobalFilter] = useState(null);
    const [errorByName, setErrorByName] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(false);


    const toast = useRef(null);
    const dt = useRef(null);
    const navigate = useNavigate();
    const {user} = useContext(AuthContext);

    useEffect(() => {
        if (!user) {
            navigate("/error-403");
        } else {
            productService.getAll(user.token)
                .then((response) => setProductList(response.data))
                .catch(() => navigate("/error-403"));
            categoryService.getAll(user.token)
                .then((response) => setCategories(response.data))
                .catch(() => navigate("/error-403"));
            sizeService.getAll(user.token)
                .then((response) => setSizes(response.data))
                .catch(() => navigate("/error-403"));
            colorService.getAll(user.token)
                .then((response) => setColors(response.data))
                .catch(() => navigate("/error-403"));
        }
    }, [user]);

    const exportCSV = () => {
        dt.current.exportCSV();
    };

    const handleOpenNewProductDialog = () => {
        setSelectedCategory(false);
        setProduct(newProduct);
        setSubmitted(false);
        setProductDialog(true);
    };

    const handleOpenEditProductDialog = (product) => {
        setSelectedCategory(true);
        setProduct({...product});
        setProductDialog(true);
    };

    const handleHideProductDialog = () => {
        setErrorByName('');
        setSubmitted(false);
        setProductDialog(false);
    };

    const handleOnChangeImage = (event) => {
        setFile(event.target.files[0]);
    }

    const handleOnChangeRadioCategory = (e) => {
        setSelectedCategory(true);
        let _product = {...product};
        _product['category'] = e.value;
        setProduct(_product);
    };

    const handleChangeSize = (e) => {
        if (e.target.checked) {
            const sizeData = {
                ...e.target.value,
                variants: checkedColors.map(item => ({...item}))
            };
            setCheckedSizes([...checkedSizes, sizeData]);
        } else {
            setCheckedSizes(checkedSizes.filter((item) => item.id !== e.target.value.id));
        }
    }

    const handleChangeColor = (e) => {
        if (e.target.checked) {
            const colorData = {
                quantity: '',
                price: '',
                ...e.target.value,
            }
            if (!checkedColors[0]?.name) {
                checkedColors.shift();
            }
            checkedColors.push({...colorData});
            setCheckedColors(checkedColors);
            setCheckedSizes(checkedSizes.map((item) => {
                item.variants = checkedColors.map(item => ({...item}))
                return item;
            }));
        } else {
            const newCheckedColors = checkedColors.filter((item) => item.id !== e.target.value.id);
            setCheckedColors(newCheckedColors);
            setCheckedSizes(checkedSizes.map((item) => {
                item.variants = newCheckedColors.map(item => ({...item}))
                return item;
            }));
        }
    }

    const handleChangeVariantInput = (e, indexSize, indexVariant, field) => {
        setCheckedSizes(checkedSizes.map((sizeItem, rowIndex) => {
            if (rowIndex === indexSize) {
                sizeItem.variants?.map((variantItem, columnIndex) => {
                    if (columnIndex === indexVariant) {
                        variantItem[field] = e.target.value;
                    }
                    return variantItem;
                })
            }
            return sizeItem;
        }));
        console.log(checkedSizes)
    }

    const handleOnChangeInput = (e, name) => {
        const val = (e.target && e.target.value) || '';
        let _product = {...product};
        _product[`${name}`] = val;
        setProduct(_product);
    };

    const handleOnChangeEditor = (htmlValue) => {
        let _product = {...product};
        _product.description = htmlValue;
        setProduct(_product);
    }

    const handleOnBlurInputName = (e) => {
        setErrorByName('');
        const nameIsValid = productList
            ? productList.some((item) => (item.name === e.target.value) && (item.id !== product.id))
            : false;
        if (nameIsValid) {
            setErrorByName("* Tên sản phẩm đã tồn tại");
        }
        if (e.target.value === '') {
            setErrorByName("* Tên sản phẩm không được để trống");
        }
    }

    const handleSaveProduct = () => {
        setSubmitted(true);
        if (errorByName || !selectedCategory) {
            return;
        }
        if (product.name.trim()) {
            let _productList = [...productList];
            let _product = {...product};
            if (file) {
                const storageRef = ref(storage, `/files/${file.name}`);
                const uploadTask = uploadBytesResumable(storageRef, file);
                uploadTask.on(
                    "state_changed",
                    (snapshot) => {
                    },
                    (err) => console.log(err),
                    () => {
                        getDownloadURL(uploadTask.snapshot.ref).then((url) => {
                            _product.image = url;
                            if (_product.id) {
                                updateProduct(_product, _productList);
                            } else {
                                saveProduct(_product, _productList);
                            }
                        });
                    }
                );
            } else {
                if (_product.id) {
                    updateProduct(_product, _productList);
                } else {
                    saveProduct(_product, _productList);
                }
            }
            setProductList(_productList);
            setProductDialog(false);
            setProduct(newProduct);
            setFile(null);
        } else {

        }
    };

    function saveProduct(_product, _productList) {
        productService.save(_product, user.token)
            .then((response) => {
                setProduct(response.data)
                _productList.unshift(response.data);
                toast.current.show({
                    severity: 'success',
                    summary: 'Successful',
                    detail: 'Product Created',
                    life: 3000
                });
            })
            .catch((error) => console.log(error));
    }

    function updateProduct(_product, _productList) {
        productService.update(_product, user.token)
            .then((response) => {
                setProduct(response.data)
                const index = findIndexById(product.id);
                _productList[index] = response.data;
                toast.current.show({severity: 'success', summary: 'Successful', detail: 'Product Updated', life: 3000});
            })
            .catch((error) => console.log(error));
    }

    const findIndexById = (id) => {
        let index = -1;
        for (let i = 0; i < productList.length; i++) {
            if (productList[i].id === id) {
                index = i;
                break;
            }
        }
        return index;
    };

    const handleHideDeleteProductDialog = () => {
        setDeleteProductDialog(false);
    };

    const handleConfirmDeleteProduct = (product) => {
        setProduct(product);
        setDeleteProductDialog(true);
    };

    const handleDeleteProduct = () => {
        productService.deleteById(product.id, user.token).then().catch(err => console.log(err));
        let _products = productList.filter((val) => val.id !== product.id);
        setProductList(_products);
        setDeleteProductDialog(false);
        setProduct(newProduct);
        toast.current.show({severity: 'success', summary: 'Successful', detail: 'Product Deleted', life: 3000});
    };

    const handleOnChangeProductsSelected = (e) => {
        setSelectedProductList(e.value);
    }

    const handleConfirmDeleteProductsSelected = () => {
        setDeleteProductListDialog(true);
    };

    const handleHideDeleteProductListDialog = () => {
        setDeleteProductListDialog(false);
    };

    const handleDeleteSelectedProducts = () => {
        let ids = [];
        selectedProductList.map(item => ids.push(item.id));
        console.log(ids);
        productService.deleteByIds(ids, user.token);
        let _products = productList.filter((val) => !selectedProductList.includes(val));
        setProductList(_products);
        setDeleteProductListDialog(false);
        setSelectedProductList(null);
        toast.current.show({severity: 'success', summary: 'Successful', detail: 'Products Deleted', life: 3000});
    };

    const leftToolbarTemplate = () => {
        return (
            <div className="flex flex-wrap gap-2">
                <Button label="New" icon="pi pi-plus" severity="success" onClick={handleOpenNewProductDialog}/>
                <Button label="Delete" icon="pi pi-trash" severity="danger"
                        onClick={handleConfirmDeleteProductsSelected}
                        disabled={!selectedProductList || !selectedProductList.length}/>
            </div>
        );
    };

    const rightToolbarTemplate = () => {
        return <Button label="Export" icon="pi pi-upload" className="p-button-help" onClick={exportCSV}/>;
    };

    const imageBodyTemplate = (rowData) => {
        return <Image src={`${rowData.image}`} zoomSrc={`${rowData.image}`} alt={rowData.name} width="80" height="80"
                      preview/>;
    };

    const actionBodyTemplate = (rowData) => {
        return (
            <React.Fragment>
                <Button icon="pi pi-pencil" rounded outlined className="mr-2"
                        onClick={() => handleOpenEditProductDialog(rowData)}/>
                <Button icon="pi pi-trash" rounded outlined severity="danger"
                        onClick={() => handleConfirmDeleteProduct(rowData)}/>
            </React.Fragment>
        );
    };

    const header = (
        <div className="flex flex-wrap gap-2 align-items-center justify-content-between">
            <h4 className="m-0">Manage Products</h4>
            <span className="p-input-icon-left">
                <i className="pi pi-search"/>
                <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search..."/>
            </span>
        </div>
    );

    const productDialogFooter = (
        <React.Fragment>
            <Button label="Cancel" icon="pi pi-times" outlined onClick={handleHideProductDialog}/>
            <Button label="Save" icon="pi pi-check" onClick={handleSaveProduct}/>
        </React.Fragment>
    );
    const deleteProductDialogFooter = (
        <React.Fragment>
            <Button label="No" icon="pi pi-times" outlined onClick={handleHideDeleteProductDialog}/>
            <Button label="Yes" icon="pi pi-check" severity="danger" onClick={handleDeleteProduct}/>
        </React.Fragment>
    );
    const deleteProductsDialogFooter = (
        <React.Fragment>
            <Button label="No" icon="pi pi-times" outlined onClick={handleHideDeleteProductListDialog}/>
            <Button label="Yes" icon="pi pi-check" severity="danger" onClick={handleDeleteSelectedProducts}/>
        </React.Fragment>
    );

    return (
        <div className="m-3">
            <Toast ref={toast}/>
            <div className="card">
                <Toolbar className="mb-4" left={leftToolbarTemplate} right={rightToolbarTemplate}></Toolbar>

                <DataTable ref={dt} value={productList} selection={selectedProductList}
                           onSelectionChange={handleOnChangeProductsSelected}
                           dataKey="id" paginator rows={10} rowsPerPageOptions={[5, 10, 25]}
                           paginatorTemplate="FirstPageLink PrevPageLink PageLinks NextPageLink LastPageLink CurrentPageReport RowsPerPageDropdown"
                           currentPageReportTemplate="Showing {first} to {last} of {totalRecords} products"
                           globalFilter={globalFilter} header={header}>
                    <Column selectionMode="multiple" exportable={true}></Column>
                    <Column field="name" header="Name" sortable style={{minWidth: '16rem'}}></Column>
                    <Column field="image" header="Image" body={imageBodyTemplate}></Column>
                    <Column field="category.name" header="Category" sortable style={{minWidth: '10rem'}}></Column>
                    <Column body={actionBodyTemplate} exportable={false} style={{minWidth: '12rem'}}></Column>
                </DataTable>
            </div>

            <Dialog visible={productDialog} style={{width: '70rem'}} breakpoints={{'960px': '75vw', '641px': '90vw'}}
                    header={product.id ? "Product Detail" : "Create New Product"} modal className="p-fluid"
                    footer={productDialogFooter} onHide={handleHideProductDialog}>

                <div className="mt-4">
                    <label className="bg-light h6 font-bold" htmlFor="inputGroupFile02">
                        {product.image ? "Choose other image" : "Choose image"}
                    </label>
                    <div className="input-group mb-3">
                        <input type="file" onChange={handleOnChangeImage} accept="/image/*" className="form-control"
                               id="inputGroupFile02"/>
                    </div>
                    {
                        product.image && <img src={`${product.image}`} alt={product.name}
                                              className="product-image block m-auto pb-3"
                                              style={{width: '30rem'}}/>
                    }

                </div>

                <div className="field">
                    <label htmlFor="name" className="font-bold">
                        Name <sup style={{color: "red"}}>*</sup>
                    </label>
                    <InputText id="name" value={product.name} onChange={(e) => handleOnChangeInput(e, 'name')}
                               className={classNames({'p-invalid': submitted && !product.name})} required
                               onBlur={handleOnBlurInputName} maxLength={50}
                               title={"Tên sản phẩm không được vượt quá 50 ký tự"}
                    />
                    <small className="p-error">{
                        errorByName || (submitted && !product.name && "* Tên sản phẩm không được để trống!")
                    }</small>
                </div>

                <div className="field">
                    <label className="font-bold">
                        Description
                    </label>
                    <Editor value={product.description}
                            onTextChange={(e) => handleOnChangeEditor(e.htmlValue)}
                            style={{height: '320px'}}/>
                </div>

                <div className="field">
                    <label className="font-bold">
                        Category <sup style={{color: "red"}}>*</sup>
                    </label>
                    {
                        submitted && !selectedCategory &&
                        <div>
                            <small className="p-error">* Vui lòng chọn danh mục cho sản phẩm!</small>
                        </div>
                    }
                    <div className="formgrid grid">
                        {categories.map((category) => (
                            <div className="field-radiobutton col-6 mt-3" key={category.id}>
                                <RadioButton inputId={category.id} name="category" value={category}
                                             onChange={handleOnChangeRadioCategory}
                                             checked={product.category.id === category.id}
                                             required={true}
                                />
                                <label htmlFor={category.id}>{category.name}</label>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="field">
                    <div className="formgrid grid">
                        <div className="field col">
                            <label className="font-bold">
                                Size
                            </label>
                            {sizes.map((size) => (
                                <div className="field-radiobutton col-6 mt-3" key={size.id}>
                                    <Checkbox inputId={size.id} name="size" value={size}
                                              onChange={handleChangeSize}
                                              checked={checkedSizes.some(item => item.id === size.id)}
                                    />
                                    <label htmlFor={size.id}>{size.name}</label>
                                </div>
                            ))}
                        </div>
                        <div className="field col">
                            <label className="font-bold">
                                Color
                            </label>
                            {colors.map((color) => (
                                <div className="field-radiobutton col-6 mt-3" key={color.id}>
                                    <Checkbox inputId={color.id} name="size" value={color}
                                              onChange={handleChangeColor}
                                              checked={checkedColors.some(item => item.id === color.id)}
                                    />
                                    <label htmlFor={color.id}>{color.name}</label>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="field">
                    <div className="formgrid grid">
                        {checkedSizes &&
                            <MDBTable align="middle">
                                <MDBTableHead align="middle">
                                    <tr>
                                        <th scope="col">Size</th>
                                        <th scope="col">Color</th>
                                        <th scope="col">Price</th>
                                        <th scope="col">Quantity</th>
                                    </tr>
                                </MDBTableHead>
                                <MDBTableBody align="middle">
                                    {checkedSizes && checkedSizes.map(({id, name = "Lỗi", variants}, indexSize) => (
                                        <>
                                            <tr className="pb-3" key={indexSize}>
                                                {checkedColors.length
                                                    ? <td rowSpan={checkedColors.length}>{name}</td>
                                                    : <td>{name}</td>}
                                                <td>{variants && variants[0]?.name}</td>
                                                <td>
                                                    <MDBInputGroup textAfter='vnđ'>
                                                        <input
                                                            onChange={e => handleChangeVariantInput(e, indexSize, 0, "price")}
                                                            className='form-control' type='number' step="any"
                                                            placeholder='Nhập giá'
                                                            value={variants && variants[0]?.price}/>
                                                    </MDBInputGroup>
                                                </td>
                                                <td>
                                                    <MDBInputGroup textAfter='cái'>
                                                        <input
                                                            onChange={e => handleChangeVariantInput(e, indexSize, 0, "quantity")}
                                                            className='form-control' type='number'
                                                            placeholder='Nhập số lượng'
                                                            value={variants && variants[0]?.quantity}/>
                                                    </MDBInputGroup>
                                                </td>
                                            </tr>
                                            {variants && variants.map(({
                                                                           name: color = "Lỗi",
                                                                           price,
                                                                           quantity
                                                                       }, indexVariant) => {
                                                return <>{indexVariant !== 0 &&
                                                    <tr className="pb-3" key={indexVariant}>
                                                        <td>{color}</td>
                                                        <td>
                                                            <MDBInputGroup textAfter='vnđ'>
                                                                <input
                                                                    onChange={e => handleChangeVariantInput(e, indexSize, indexVariant, "price")}
                                                                    value={price} className='form-control'
                                                                    type='number' step="any" placeholder='Nhập giá'/>
                                                            </MDBInputGroup>
                                                        </td>
                                                        <td>
                                                            <MDBInputGroup textAfter='cái'>
                                                                <input
                                                                    onChange={e => handleChangeVariantInput(e, indexSize, indexVariant, "quantity")}
                                                                    value={quantity} className='form-control'
                                                                    type='number' placeholder='Nhập số lượng'/>
                                                            </MDBInputGroup>
                                                        </td>
                                                    </tr>}</>
                                            })}
                                        </>
                                    ))}
                                </MDBTableBody>
                            </MDBTable>
                        }
                    </div>
                </div>


                {/*<div className="formgrid grid">*/}
                {/*    <div className="field col">*/}
                {/*        <label htmlFor="price" className="font-bold">*/}
                {/*            Price*/}
                {/*        </label>*/}
                {/*        <InputNumber id="price" value={product.price}*/}
                {/*                     onValueChange={(e) => onInputNumberChange(e, 'price')} mode="currency"*/}
                {/*                     currency="USD" locale="en-US"/>*/}
                {/*    </div>*/}
                {/*    <div className="field col">*/}
                {/*        <label htmlFor="quantity" className="font-bold">*/}
                {/*            Quantity*/}
                {/*        </label>*/}
                {/*        <InputNumber id="quantity" value={product.quantity}*/}
                {/*                     onValueChange={(e) => onInputNumberChange(e, 'quantity')}/>*/}
                {/*    </div>*/}
                {/*</div>*/}
            </Dialog>

            <Dialog visible={deleteProductDialog} style={{width: '32rem'}}
                    breakpoints={{'960px': '75vw', '641px': '90vw'}} header="Confirm" modal
                    footer={deleteProductDialogFooter} onHide={handleHideDeleteProductDialog}>
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle mr-3" style={{fontSize: '2rem'}}/>
                    {product && (
                        <span>
                            Are you sure you want to delete <b>{product.name}</b>?
                        </span>
                    )}
                </div>
            </Dialog>

            <Dialog visible={deleteProductListDialog} style={{width: '32rem'}}
                    breakpoints={{'960px': '75vw', '641px': '90vw'}} header="Confirm" modal
                    footer={deleteProductsDialogFooter} onHide={handleHideDeleteProductListDialog}>
                <div className="confirmation-content">
                    <i className="pi pi-exclamation-triangle mr-3" style={{fontSize: '2rem'}}/>
                    {product && <span>Are you sure you want to delete the selected products?</span>}
                </div>
            </Dialog>
        </div>
    );
}

export default Products;
